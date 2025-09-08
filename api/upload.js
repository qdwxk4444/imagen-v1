import { IncomingForm } from 'formidable';
import { GoogleGenAI, Modality } from '@google/genai';

export const config = {
  api: {
    bodyParser: false,
  },
};

// IMPORTANT: Make sure to set the API_KEY environment variable in Vercel.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash-image-preview';

/**
 * Converts a File object to a GoogleGenAI.Part object.
 * @param file The file to convert.
 * @returns A promise that resolves to the Part object.
 */
async function fileToGenerativePart(file) {
  const base64EncodedData = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
  
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
}

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to process upload.' });
    }
    
    // 从前端接收文件和命令
    const productFile = files.productFile[0];
    const poseFile = files.poseFile ? files.poseFile[0] : null;
    const userPrompt = fields.userPrompt[0];
    const selectedAspectRatio = fields.selectedAspectRatio[0];

    try {
      const parts = [await fileToGenerativePart(productFile)];

      let instructionText = `Generate a photorealistic, high-resolution e-commerce model photograph in a ${selectedAspectRatio} aspect ratio.
- **INSTRUCTIONS:**
- The model must be wearing the exact clothing item from the product image.
- Generate a complete, new model wearing the product.
- The final image must look like a real photograph for a fashion website.
- The background should be a clean, minimalist studio setting that complements the product.`;
      
      if (poseFile) {
          instructionText += `\n- The generated model MUST perfectly replicate the shooting angle, camera perspective, pose, body angle, and orientation from the pose reference image.`;
          parts.push(await fileToGenerativePart(poseFile));
      }

      instructionText += `\n- **CONTEXT:** ${userPrompt}`;
      parts.unshift({ text: instructionText });
      
      const contents = { parts };

      const response = await ai.models.generateContent({
          model: model,
          contents: contents,
          config: {
              responseModalities: [Modality.IMAGE, Modality.TEXT],
          },
      });

      let generatedImage = null;
      let generatedText = null;
      for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
              const base64ImageBytes = part.inlineData.data;
              generatedImage = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
          } else if (part.text) {
              generatedText = part.text;
          }
      }

      if (generatedImage) {
        res.status(200).json({ image: generatedImage, text: generatedText });
      } else {
        res.status(500).json({ error: "The model did not return an image. Please try adjusting your prompt or images." });
      }

    } catch (error) {
      console.error("Error generating image from AI:", error);
      res.status(500).json({ error: "An error occurred while generating the image. Please check the console for details." });
    }
  });
};
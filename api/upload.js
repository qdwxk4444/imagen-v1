import { IncomingForm } from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const form = new IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to process upload.' });
    }
    
    // 这里的 fields 和 files 包含了你从前端上传的数据
    // 例如：files.file.filepath 是上传图片的临时路径
    // fields.command 是你从前端传来的命令

    console.log('Received fields:', fields);
    console.log('Received files:', files);

    // TODO: 在这里添加你的后端逻辑来处理图片和执行命令
    // 例如：调用一个外部服务，或者运行一个脚本

    res.status(200).json({ message: 'File uploaded and command executed successfully!' });
  });
};
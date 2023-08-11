import compressing from 'compressing';
import express from 'express';
import multer from 'multer';
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

const uploadDir = path.join(__dirname, './uploads');

console.log('uploadDir', uploadDir);

// 配置上传文件的存储
const storage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		cb(null, uploadDir);
	},
	filename: (_req, file, cb) => {
		console.log('file', file);
		cb(null, file.originalname);
	},
});

const upload = multer({storage: storage});

app.post('/upload', upload.single('file'), async (req, res) => {
	try {
		console.log('upload', req.file);
		const {filename = ''} = req.file || {};
		await compressing.zip.uncompress(
			`${uploadDir}/${filename}`,
			`${uploadDir}/${filename.replace('.zip', '')}`
		);
		res.send(req.file);
	} catch (err) {
		console.log('err', err);
		res.send(400);
	}
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});

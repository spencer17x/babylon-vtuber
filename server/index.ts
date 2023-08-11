import compressing from 'compressing';
import cors from 'cors';
import express from 'express';
import * as fs from "fs";
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
		cb(null, Buffer.from(file.originalname, 'binary').toString());
	},
});

const upload = multer({storage: storage});

app.use(cors());

app.use('/uploads', express.static(uploadDir));

app.post('/upload', upload.single('file'), async (req, res) => {
	try {
		console.log('upload', req.file);
		const {filename = ''} = req.file || {};
		await compressing.zip.uncompress(
			`${uploadDir}/${filename}`,
			`${uploadDir}/${filename.replace('.zip', '')}`,
			{zipFileNameEncoding: 'GBK'}
		);
		const files = fs.readdirSync(
			`${uploadDir}/${filename.replace('.zip', '')}`
		);
		const pmxFile = files.find((file) => file.endsWith('.pmx'));
		console.log('pmxFile', pmxFile)
		res.json({
			code: 0,
			data: {
				url: `http://localhost:3000/uploads/${filename.replace('.zip', '')}/${pmxFile}`,
			}
		});
	} catch (err) {
		console.log('err', err);
		res.send(400);
	}
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});

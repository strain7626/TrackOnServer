const express = require("express")
const multer = require("multer")
const uuid4 = require("uuid4") //파일 이름 안 겹치게 하기
const path = require("path")

const app = express()
const publicPath = path.join(__dirname, "public")
// const upload = multer({
//     dest : "files/",
// })
const upload = multer({
    storage: multer.diskStorage({
        //파일 이름 설정
      	filename(req, file, done) {
          	console.log(file);
			done(null, uuid4() + file.originalname);
        },
        //파일 저장 경로 설정
		destination(req, file, done) {
      		console.log(file);
		    done(null, path.join(__dirname, "files"));
	    },
    }),
});
const uploadMiddleware = upload.single("fileName")

app.use(express.static(publicPath))
// app.use(uploadMiddleware)

app.post("/upload", uploadMiddleware, (req, res) => {
    console.log("Debug 1")
    console.log(req.file)
    res.send(req.file)
})

app.listen(3000, () => console.log("3000 port server opened!!"))
const express = require("express") //필수적인 서버 구축
const multer = require("multer") //파일 다루는 거
const uuid4 = require("uuid4") //파일 이름 안 겹치게 하기
const path = require("path") //경로설정

const app = express()
const publicPath = path.join(__dirname, "public")
// const upload = multer({
//     dest : "files/",
// })

//모델 테스트 기능 용
app.set("views", "testFiles")
app.set("view engine", "ejs")

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

// "/test" 라우터로 접속 시 모델 테스트 가능
app.get("/test", (req, res) => res.render("teachable_machine_test.ejs"))

app.listen(3000, () => console.log("3000 port server opened!!"))
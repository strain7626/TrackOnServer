const express = require("express");
const multer = require("multer");
const uuid4 = require("uuid4"); // 파일 이름 중복 방지
const path = require("path");
const mysql = require("mysql2");
const AWS = require("aws-sdk");
const bodyParser = require("body-parser");

//티쳐블 모델 불러오기
const TeachableMachine = require("@sashido/teachablemachine-node");
const model = new TeachableMachine({
    modelUrl: "https://teachablemachine.withgoogle.com/models/c0z9J2mwh/"
});

require("dotenv").config();

const app = express();

app.use(bodyParser.json()); // JSON 데이터 파싱
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
// MySQL 연결 설정
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// S3 클라이언트 설정
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

// 파일 업로드 API
app.post("/upload", uploadMiddleware, async (req, res) => {
    try {
        const file = req.file;
        const { latitude, longitude, wear_level, timestamp, phonenumber } = req.body;

        // 필수 데이터 유효성 검사
        if (!file || !latitude || !longitude || !wear_level || !timestamp || !phonenumber) {
            return res.status(400).json({ message: "모든 필드를 입력해야 합니다." });
        }

        // S3에 파일 업로드
        const s3Params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `uploads/${uuid4()}_${file.originalname}`, // 파일 경로와 이름
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: "public-read", // 퍼블릭 접근 허용
        };

        const uploadResult = await s3.upload(s3Params).promise();
        console.log("S3 Upload Success:", uploadResult.Location);

        // DB에 데이터 저장
        const sql = `
            INSERT INTO road_wear_reports 
            (photo_url, latitude, longitude, wear_level, timestamp, phonenumber) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [
            uploadResult.Location,             // S3에 업로드된 파일 URL
            parseFloat(latitude),              // 위도
            parseFloat(longitude),             // 경도
            wear_level,                        // 마모 정도
            new Date(timestamp),               // ISO 시간 형식
            phonenumber,                       // 신고자 전화번호
        ];

        //이미지 분류
        model.classify({
            imageUrl : "URL NEEDED"
        }).then((predictions) => {
            let top_value = predictions[0]['class'] // 최상위 값의 클래스 이름만 저장
            console.log("Predictions:", top_value);
            values[wear_level] = top_value;
        }).catch((e) => {
            console.log("ERROR", e);
        });


        db.query(sql, values, (err, result) => {
            if (err) throw err;
            console.log("DB Insert Success:", result);
            res.json({
                message: "파일 업로드 및 데이터 저장 성공",
                fileUrl: uploadResult.Location,
            });
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "파일 업로드 실패", error: error.message });
    }
});
//서버실행
app.listen(3000, () => console.log("3000 port server opened!!"))
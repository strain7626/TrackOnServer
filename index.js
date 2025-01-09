const express = require("express");
const multer = require("multer");
const uuid4 = require("uuid4"); // 파일 이름 중복 방지
const path = require("path");
const mysql = require("mysql2");
const AWS = require("aws-sdk");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const publicPath = path.join(__dirname, "public");

app.use(express.static(publicPath));
app.use(bodyParser.json()); // JSON 데이터 파싱

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


//모델 테스트 기능 용
app.set("views", "testFiles")
app.set("view engine", "ejs")

const upload = multer({
    storage: multer.memoryStorage(),
});

// 파일 업로드 API
app.post("/upload", upload.single("file"), async (req, res) => {
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
// "/test" 라우터로 접속 시 모델 테스트 가능
app.get("/test", (req, res) => res.render("teachable_machine_test.ejs"))
//서버실행
app.listen(3000, () => console.log("3000 port server opened!!"))
const express = require("express");
const multer = require("multer");
const uuid4 = require("uuid4"); // 파일 이름 중복 방지
const path = require("path");
const mysql = require("mysql2");
const AWS = require("aws-sdk");
const bodyParser = require("body-parser");
const cors = require("cors"); // CORS 모듈 추가
const { PythonShell } = require("python-shell");
require("dotenv").config();

const app = express();

app.use(cors()); // CORS 활성화
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

// multer 설정: 여러 파일을 받을 수 있도록 변경
const upload = multer({
    storage: multer.memoryStorage(),
});

// 파일 업로드 API
app.post("/upload", upload.array("file"), async (req, res) => {
    try {
        const files = req.files; // 여러 파일을 받음
        const { latitude, longitude, timestamp, phonenumber } = req.body;

        // 필수 데이터 유효성 검사
        if (!files || files.length === 0 || !latitude || !longitude || !timestamp || !phonenumber) {
            return res.status(400).json({ message: "모든 필드를 입력해야 합니다." });
        }

        // 각 파일에 대해 S3 업로드 및 DB 저장
        const insertPromises = files.map(async (file) => {
            // S3에 파일 업로드
            const s3Params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `uploads/${uuid4()}_${file.originalname}`, // 파일 경로와 이름
                Body: file.buffer,
                ContentType: file.mimetype,
            };

            const uploadResult = await s3.upload(s3Params).promise();
            console.log("S3 Upload Success:", uploadResult.Location);

            const options = {
                args: [uploadResult.Location],
            };

            const predictionResult = await new Promise((resolve, reject) => {
                PythonShell.run("models/k.py", options, (err, result) => {
                    if (err) {
                        console.error("PythonShell Error:", err);
                        reject(err)
                    };
                    resolve(result)
                });
            });

            const className = predictionResult[0].trim();
            console.log("Presicted Class :", className);

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
                className,                         // AI 모델로 예측된 값이 아니므로 임의의 값 "unknown" 저장
                new Date(timestamp),               // ISO 시간 형식
                phonenumber,                       // 신고자 전화번호
            ];

            return new Promise((resolve, reject) => {
                db.query(sql, values, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log("DB Insert Success:", result);
                        resolve(result);
                    }
                });
            });
        });

        // 모든 파일 업로드 및 DB 삽입 완료 후 응답
        await Promise.all(insertPromises);
        res.json({
            message: "파일 업로드 및 데이터 저장 성공",
            fileCount: files.length,
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "파일 업로드 실패", error: error.message });
    }
});

// 서버 실행
app.listen(3000, () => console.log("3000 port server opened!!"));

const express = require("express");
const mysql = require("mysql2");
const AWS = require("aws-sdk");

const router = express.Router();

require("dotenv").config();

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

router.get("/", (req, res) => {
    console.log("/download 요청");

    const wearLevels = ["RoadLevel2", "PaintLevel2"]; // 마모가 진행된 값들만 불러옴
    const sql = "SELECT * FROM road_wear_reports WHERE wear_level IN (?, ?)";

    db.query(sql, wearLevels, (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).json({ error: "데이터베이스 쿼리 실패" });
        } else {
            if (results.length === 0) {
                return res.status(404).json({ error: "파일이 없습니다." });
            }

            // S3에서 사진 파일 다운로드
            const fileUrl = results[0].photo_url; // S3에서 저장된 URL

            const params = {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: fileUrl.split('amazonaws.com/')[1], // URL에서 파일 경로 추출
            };

            s3.getObject(params, (err, data) => {
                if (err) {
                    console.error("S3 파일 다운로드 실패:", err);
                    return res.status(500).json({ error: "파일 다운로드 실패" });
                }

                // 파일 다운로드 응답
                res.setHeader('Content-Type', data.ContentType);
                res.setHeader('Content-Disposition', 'attachment; filename="downloaded_file"');
                res.send(data.Body);
            });
        }
    });
});

module.exports = router;
const express = require("express");
const mysql = require("mysql2");

const router = express.Router();

require("dotenv").config();

// MySQL 연결 설정
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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
            res.json({
                data: results,
            });
        }
    });
});

module.exports = router;
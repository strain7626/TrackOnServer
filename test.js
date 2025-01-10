const express = require("express");
const downloadRoute = require("./route/downloadRoute");

const app = express();

app.use("/download",downloadRoute)
app.use(bodyParser.json()); // JSON 데이터 파싱

//서버실행
app.listen(3000, () => console.log("3000 port server opened!!"))
const express = require("express");
const downloadRoute = require("./route/downloadRoute");

const app = express();

app.use("/download",downloadRoute)

//서버실행
app.listen(3000, () => console.log("3000 port server opened!!"))
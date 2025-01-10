const express = require("express")
const router = express.Router()

router.get("/", (req, res) => {
    console.log("Debug1 Gate Passed")
    res.json({
        my : "let'go",
    })
})

module.exports = router
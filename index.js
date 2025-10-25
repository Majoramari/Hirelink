import express from "express";

const PORT = 3000;
const app = express();
const host = "localhost";

app.listen(PORT, () => {
    console.log(`Server listening at http://${host}:${PORT}`);
});

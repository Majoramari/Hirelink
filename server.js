import express from "express";
import bootstrap from "./src/app.controller.js";


const PORT = 3000 || process.env.PORT;
const app = express();
const host = "localhost" ;


await bootstrap(app, express);

app.listen(PORT, () => {
    console.log(`Server listening at http://${host}:${PORT}`);
});

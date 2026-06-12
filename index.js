import express from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { DateTime, Duration } from "luxon"
import { WebSocketServer } from 'ws';
import { send } from "node:process";

const app = express();

const port = 3000;

// Получаем путь до файла
const __filename = url.fileURLToPath(import.meta.url);
// Получаем директорию файла
const __dirname = path.dirname(__filename);

const timeZone = "UTC"

app.use(express.static(path.join(__dirname, "public")));

const loadBuses = async () => {
    const data = await readFile(path.join(__dirname, "buses.json"), "utf-8");
    return JSON.parse(data);
}

const getNextDeparture = (time, gap) => {
    const currentTime = DateTime.now().setZone(timeZone);

    const [hours, minutes] = time.split(":").map(n => Number(n));

    let departure = DateTime.now().setZone(timeZone).set({ hours, minutes, seconds: 0, milliseconds: 0 });

    const endOfDay = DateTime.now().setZone(timeZone).set({ hours: 23, minutes: 59 });

    if (currentTime > departure) {
        departure = departure.plus({minutes: gap})
    }

    if (departure > endOfDay) {
        departure = departure.startOf("day").plus({ days: 1 }).set({ hours, minutes })
    }

    while (currentTime > departure) {
        departure = departure.plus({ minutes: gap });

        if (departure > endOfDay) {
            departure = departure.startOf("day").plus({ days: 1 }).set({ hours, minutes })
        }
    }

    return departure;
}

const sortBuses = (buses) => [...buses].sort((a, b) => new Date(`${a.nextDeparture.date}T${a.nextDeparture.time}`) - new Date(`${b.nextDeparture.date}T${b.nextDeparture.time}`))

const sendUpdatedData = async () => {
    const fetchedRoutes = await loadBuses();

    const currentTime = DateTime.now().setZone(timeZone);

    const buses = fetchedRoutes.map(route => {
        const nextDeparture = getNextDeparture(route.firstDepartureTime, route.frequencyMinutes);

        const timeRemaining = Duration.fromMillis(nextDeparture.diff(currentTime).toMillis());

        return { ...route, nextDeparture: { date: nextDeparture.toFormat("yyyy-MM-dd"), time: nextDeparture.toFormat("HH:mm:ss"), remaining: timeRemaining.toFormat("hh:mm:ss") }}
    });
    // console.log(buses);
    return buses;
}


app.get('/next-departure', async (request, response) => {
    try {
        const updatedBuses = await sendUpdatedData();

        const sortedBuses = sortBuses(updatedBuses);

        response.json(sortedBuses);

        // console.log("updated buses:", updatedBuses);
    } catch(err) {
        console.error("Ошибка на сервере:", err);
        response.status(500).json({ error: err.message });
    }
})

const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

wss.on('connection', (ws) => {
    console.log("WS connection established");
    clients.add(ws);

    const sendUpdates = async () => {
        try {
            const fetchedBuses = await sendUpdatedData();

            const sortedBuses = sortBuses(fetchedBuses);

            ws.send(JSON.stringify(sortedBuses));

        } catch(error) {
            console.error(`Error websocket connection: ${error}`)
        }
    }

    const intervalId = setInterval(sendUpdates, 1000);

    ws.on('close', () => {
        clearInterval(intervalId);
        clients.delete(ws);
        console.log("WS connection closed");
    })
})

const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

server.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
    })
})
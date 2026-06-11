import express from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { DateTime } from "luxon"

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

    let departure = DateTime.now().setZone(timeZone).set({ hours, minutes });

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

    const buses = fetchedRoutes.map(route => {
        const nextDeparture = getNextDeparture(route.firstDepartureTime, route.frequencyMinutes);

        return { ...route, nextDeparture: { date: nextDeparture.toFormat("yyyy-MM-dd"), time: nextDeparture.toFormat("HH:mm:ss") }}
    });
    console.log(buses);
    return buses
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

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
})
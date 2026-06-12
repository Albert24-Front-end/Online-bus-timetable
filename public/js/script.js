const fetchBusData = async () => {
    try {
        const response = await fetch("/next-departure");

        if (!response.ok) {
            throw new Error(`HTTP erro, status: ${response.status}`);
        }

        const data = response.json();

        return data;
    }
    catch(error) {
        console.log(`Error fetching bus data: ${error}`);
    }
}

const formatDate = (date) => date.toISOString().split("T")[0];
const formatTime = (date) => date.toTimeString().split(" ")[0].slice(0, 5);

const getRemainingSeconds = (departureTime) => {
    const now = new Date();
    const timeDif = departureTime - now;

    return Math.floor(timeDif / 1000);
}

const renderBusData = (buses) => {
    const tableBody = document.querySelector("#bus tbody");
    tableBody.textContent = "";

    // console.log(buses);

    buses.forEach(bus => {
        const row = document.createElement("tr");

        const nextDepartureDateTimeUTC = new Date(
            `${bus.nextDeparture.date}T${bus.nextDeparture.time}Z`
        );

        const remainingSeconds = getRemainingSeconds(nextDepartureDateTimeUTC);
        const timeToBus = 60;

        const remainingTimeText = remainingSeconds < timeToBus ? `Отправляется уже через ${bus.nextDeparture.remaining}` : bus.nextDeparture.remaining;

        row.innerHTML = `
            <td>${bus.busNumber}</td>
            <td>${bus.startPoint} - ${bus.endPoint}</td>
            <td>${formatDate(nextDepartureDateTimeUTC)}</td>
            <td>${formatTime(nextDepartureDateTimeUTC)}</td>
            <td>${bus.frequencyMinutes}</td>
            <td>${remainingTimeText}</td>
        `;
        tableBody.appendChild(row)
    });
}

const initWebSocket = () => {
    const ws = new WebSocket(`ws://${location.host}`);

    ws.addEventListener('open', () => {
        console.log("WS connection established");
    })

    ws.addEventListener('message', (event) => {
        const buses = JSON.parse(event.data);
        renderBusData(buses);
    })

    ws.addEventListener('error', (error) => {
        console.log(`WS error: ${error}`);
    })

    ws.addEventListener('close', () => {
        console.log("WS connection closed");
    })
}

const updateCurrentTime =  () => {
    const currentTimeElem = document.querySelector("#current-time");
    const currentTime = new Date();
    currentTimeElem.textContent = currentTime.toTimeString().split(" ")[0];

    setTimeout(() => {updateCurrentTime()}, 1000)
}

const init = async () => {
    const buses = await fetchBusData();
    renderBusData(buses);

    initWebSocket();

    updateCurrentTime();
}

init()
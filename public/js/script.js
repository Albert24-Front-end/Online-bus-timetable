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

const renderBusData = (buses) => {
    const tableBody = document.querySelector("#bus tbody");
    tableBody.textContent = "";

    // console.log(buses);

    buses.forEach(bus => {
        const row = document.createElement("tr");

        const nextDepartureDateTimeUTC = new Date(
            `${bus.nextDeparture.date}T${bus.nextDeparture.time}Z`
        );

        row.innerHTML = `
            <td>${bus.busNumber}</td>
            <td>${bus.startPoint} - ${bus.endPoint}</td>
            <td>${formatDate(nextDepartureDateTimeUTC)}</td>
            <td>${formatTime(nextDepartureDateTimeUTC)}</td>
            <td>${bus.frequencyMinutes}</td>
        `;
        tableBody.appendChild(row)
    });
}

const init = async () => {
    const buses = await fetchBusData();
    renderBusData(buses);
}

init()
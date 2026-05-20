const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const message = document.getElementById("message");

const weatherCard = document.getElementById("weatherCard");
const cityName = document.getElementById("cityName");
const condition = document.getElementById("condition");
const temperature = document.getElementById("temperature");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");

const forecastSection = document.getElementById("forecastSection");
const forecastGrid = document.getElementById("forecastGrid");

const weatherCodes = {
  0: { text: "Clear Sky", icon: "☀️" },
  1: { text: "Mainly Clear", icon: "🌤️" },
  2: { text: "Partly Cloudy", icon: "⛅" },
  3: { text: "Overcast", icon: "☁️" },
  45: { text: "Fog", icon: "🌫️" },
  48: { text: "Fog", icon: "🌫️" },
  51: { text: "Light Drizzle", icon: "🌦️" },
  53: { text: "Drizzle", icon: "🌦️" },
  55: { text: "Heavy Drizzle", icon: "🌧️" },
  61: { text: "Light Rain", icon: "🌧️" },
  63: { text: "Rain", icon: "🌧️" },
  65: { text: "Heavy Rain", icon: "🌧️" },
  71: { text: "Light Snow", icon: "🌨️" },
  73: { text: "Snow", icon: "🌨️" },
  75: { text: "Heavy Snow", icon: "❄️" },
  80: { text: "Rain Showers", icon: "🌦️" },
  81: { text: "Rain Showers", icon: "🌦️" },
  82: { text: "Heavy Showers", icon: "⛈️" },
  95: { text: "Thunderstorm", icon: "⛈️" }
};

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const city = cityInput.value.trim();

  if (city === "") {
    showMessage("Please enter a city name.");
    return;
  }

  getWeather(city);
});

async function getWeather(city) {
  try {
    showMessage("Loading weather...");
    weatherCard.classList.add("hidden");
    forecastSection.classList.add("hidden");

    const location = await getCityLocation(city);
    const weather = await getWeatherData(location);

    displayCurrentWeather(location, weather);
    displayForecast(weather);

    localStorage.setItem("lastCity", city);

    showMessage("");
  } catch (error) {
    showMessage(error.message);
  }
}

async function getCityLocation(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Try another city.");
  }

  return data.results[0];
}

async function getWeatherData(location) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=5`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Weather data could not be loaded.");
  }

  return await response.json();
}

function displayCurrentWeather(location, weather) {
  const current = weather.current;
  const currentCode = weatherCodes[current.weather_code] || {
    text: "Unknown Conditions",
    icon: "🌡️"
  };

  cityName.textContent = `${location.name}, ${location.country}`;
  condition.textContent = `${currentCode.icon} ${currentCode.text}`;
  temperature.textContent = `${Math.round(current.temperature_2m)}°F`;
  feelsLike.textContent = `${Math.round(current.apparent_temperature)}°F`;
  humidity.textContent = `${current.relative_humidity_2m}%`;
  wind.textContent = `${Math.round(current.wind_speed_10m)} mph`;

  weatherCard.classList.remove("hidden");
}

function displayForecast(weather) {
  forecastGrid.innerHTML = "";

  weather.daily.time.forEach(function (day, index) {
    const code = weather.daily.weather_code[index];
    const forecastInfo = weatherCodes[code] || {
      text: "Weather",
      icon: "🌡️"
    };

    const card = document.createElement("div");
    card.className = "forecast-card";

    card.innerHTML = `
      <h3>${formatDate(day)}</h3>
      <div class="forecast-icon">${forecastInfo.icon}</div>
      <p>${forecastInfo.text}</p>
      <p><strong>High:</strong> ${Math.round(weather.daily.temperature_2m_max[index])}°F</p>
      <p><strong>Low:</strong> ${Math.round(weather.daily.temperature_2m_min[index])}°F</p>
    `;

    forecastGrid.appendChild(card);
  });

  forecastSection.classList.remove("hidden");
}

function formatDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function showMessage(text) {
  message.textContent = text;
}

const lastCity = localStorage.getItem("lastCity");

if (lastCity) {
  cityInput.value = lastCity;
  getWeather(lastCity);
}

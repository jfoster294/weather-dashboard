const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const localWeatherButton = document.getElementById("localWeatherButton");
const clearRecentButton = document.getElementById("clearRecentButton");

const cityName = document.getElementById("cityName");
const cityCoords = document.getElementById("cityCoords");
const temperature = document.getElementById("temperature");
const conditionText = document.getElementById("conditionText");
const feelsLike = document.getElementById("feelsLike");
const highTemp = document.getElementById("highTemp");
const lowTemp = document.getElementById("lowTemp");
const weatherIcon = document.getElementById("weatherIcon");

const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("windSpeed");
const pressure = document.getElementById("pressure");
const visibility = document.getElementById("visibility");

const forecastGrid = document.getElementById("forecastGrid");
const updatedTime = document.getElementById("updatedTime");
const messageBox = document.getElementById("messageBox");
const recentCities = document.getElementById("recentCities");
const systemStatus = document.getElementById("systemStatus");

let recentSearches = JSON.parse(localStorage.getItem("recentWeatherCities")) || [];

document.addEventListener("DOMContentLoaded", function () {
  renderRecentCities();
  loadLocalWeather();
});

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const city = cityInput.value.trim();

  if (!city) {
    showMessage("Type a city name first.");
    return;
  }

  searchCity(city);
});

localWeatherButton.addEventListener("click", function () {
  loadLocalWeather();
});

clearRecentButton.addEventListener("click", function () {
  recentSearches = [];
  localStorage.removeItem("recentWeatherCities");
  renderRecentCities();
});

function loadLocalWeather() {
  hideMessage();
  systemStatus.textContent = "LOCATING";

  if (!navigator.geolocation) {
    showMessage("Your browser does not support location. Loading Phoenix instead.");
    loadDefaultCity();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      fetchWeather(latitude, longitude, "Local Weather", "Current GPS position");
    },
    function () {
      showMessage("Location permission was blocked. Loading Phoenix, Arizona instead.");
      loadDefaultCity();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000
    }
  );
}

function loadDefaultCity() {
  fetchWeather(33.4484, -112.074, "Phoenix, Arizona", "33.4484° N, 112.0740° W");
}

async function searchCity(city) {
  try {
    hideMessage();
    systemStatus.textContent = "SEARCHING";

    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      showMessage("No city found. Try another search.");
      systemStatus.textContent = "LIVE";
      return;
    }

    const result = geoData.results[0];
    const displayName = `${result.name}${result.admin1 ? ", " + result.admin1 : ""}`;
    const coordsText = `${result.latitude.toFixed(2)}°, ${result.longitude.toFixed(2)}°`;

    saveRecentCity(displayName);

    fetchWeather(result.latitude, result.longitude, displayName, coordsText);
    cityInput.value = "";
  } catch (error) {
    showMessage("Something went wrong while searching. Try again.");
    systemStatus.textContent = "ERROR";
  }
}

async function fetchWeather(latitude, longitude, displayName, coordsText) {
  try {
    systemStatus.textContent = "LOADING";

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl,visibility` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;

    const response = await fetch(weatherUrl);
    const data = await response.json();

    updateCurrentWeather(data, displayName, coordsText);
    updateForecast(data);
    hideMessage();

    systemStatus.textContent = "LIVE";
  } catch (error) {
    showMessage("Weather data could not be loaded. Check your connection and try again.");
    systemStatus.textContent = "ERROR";
  }
}

function updateCurrentWeather(data, displayName, coordsText) {
  const current = data.current;
  const daily = data.daily;

  const weatherInfo = getWeatherInfo(current.weather_code);

  cityName.textContent = displayName;
  cityCoords.textContent = coordsText;

  temperature.textContent = `${Math.round(current.temperature_2m)}°`;
  conditionText.textContent = weatherInfo.label;
  feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°`;

  highTemp.textContent = `${Math.round(daily.temperature_2m_max[0])}°`;
  lowTemp.textContent = `${Math.round(daily.temperature_2m_min[0])}°`;

  weatherIcon.textContent = weatherInfo.icon;

  humidity.textContent = `${current.relative_humidity_2m}%`;
  windSpeed.textContent = `${Math.round(current.wind_speed_10m)} mph`;
  pressure.textContent = `${Math.round(current.pressure_msl)} hPa`;

  const miles = current.visibility ? current.visibility / 1609.34 : 0;
  visibility.textContent = `${miles.toFixed(1)} mi`;

  const time = new Date(current.time);
  updatedTime.textContent = `Data updated: ${time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function updateForecast(data) {
  forecastGrid.innerHTML = "";

  for (let i = 0; i < 5; i++) {
    const date = new Date(data.daily.time[i] + "T00:00:00");
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const weatherInfo = getWeatherInfo(data.daily.weather_code[i]);
    const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
    const minTemp = Math.round(data.daily.temperature_2m_min[i]);

    const card = document.createElement("article");
    card.className = "forecast-card";

    card.innerHTML = `
      <p>${dayName}</p>
      <div class="forecast-icon">${weatherInfo.icon}</div>
      <h3>${maxTemp}°</h3>
      <span>${minTemp}°</span>
    `;

    forecastGrid.appendChild(card);
  }
}

function getWeatherInfo(code) {
  const weatherMap = {
    0: { label: "Clear Sky", icon: "☀️" },
    1: { label: "Mostly Clear", icon: "🌤️" },
    2: { label: "Partly Cloudy", icon: "⛅" },
    3: { label: "Cloudy", icon: "☁️" },
    45: { label: "Fog", icon: "🌫️" },
    48: { label: "Fog", icon: "🌫️" },
    51: { label: "Light Drizzle", icon: "🌦️" },
    53: { label: "Drizzle", icon: "🌦️" },
    55: { label: "Heavy Drizzle", icon: "🌧️" },
    61: { label: "Light Rain", icon: "🌧️" },
    63: { label: "Rain", icon: "🌧️" },
    65: { label: "Heavy Rain", icon: "⛈️" },
    71: { label: "Light Snow", icon: "🌨️" },
    73: { label: "Snow", icon: "🌨️" },
    75: { label: "Heavy Snow", icon: "❄️" },
    80: { label: "Rain Showers", icon: "🌧️" },
    81: { label: "Rain Showers", icon: "🌧️" },
    82: { label: "Heavy Showers", icon: "⛈️" },
    95: { label: "Thunderstorm", icon: "⛈️" },
    96: { label: "Thunderstorm", icon: "⛈️" },
    99: { label: "Thunderstorm", icon: "⛈️" }
  };

  return weatherMap[code] || { label: "Weather Data", icon: "☁️" };
}

function saveRecentCity(city) {
  recentSearches = recentSearches.filter(function (item) {
    return item.toLowerCase() !== city.toLowerCase();
  });

  recentSearches.unshift(city);
  recentSearches = recentSearches.slice(0, 5);

  localStorage.setItem("recentWeatherCities", JSON.stringify(recentSearches));
  renderRecentCities();
}

function renderRecentCities() {
  recentCities.innerHTML = "";

  if (recentSearches.length === 0) {
    recentCities.innerHTML = `<p class="empty-recent">No recent searches yet.</p>`;
    return;
  }

  recentSearches.forEach(function (city) {
    const button = document.createElement("button");
    button.className = "recent-city";
    button.type = "button";
    button.textContent = city;

    button.addEventListener("click", function () {
      searchCity(city);
    });

    recentCities.appendChild(button);
  });
}

function showMessage(message) {
  messageBox.textContent = message;
  messageBox.classList.remove("hidden");
}

function hideMessage() {
  messageBox.textContent = "";
  messageBox.classList.add("hidden");
}

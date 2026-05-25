const UNSPLASH_ACCESS_KEY = "PASTE_YOUR_UNSPLASH_ACCESS_KEY_HERE";

const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const citySuggestions = document.getElementById("citySuggestions");
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
const backgroundCredit = document.getElementById("backgroundCredit");

let recentSearches = JSON.parse(localStorage.getItem("recentWeatherCities")) || [];
let suggestionResults = [];
let suggestionTimer;

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

  hideSuggestions();
  searchCity(city);
});

cityInput.addEventListener("input", function () {
  const city = cityInput.value.trim();

  clearTimeout(suggestionTimer);

  if (city.length < 2) {
    hideSuggestions();
    return;
  }

  suggestionTimer = setTimeout(function () {
    getCitySuggestions(city);
  }, 250);
});

document.addEventListener("click", function (event) {
  if (!searchForm.contains(event.target)) {
    hideSuggestions();
  }
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
  hideSuggestions();
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

      fetchWeather(
        latitude,
        longitude,
        "Local Weather",
        `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`
      );
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
  fetchWeather(
    33.4484,
    -112.0740,
    "Phoenix, Arizona",
    "33.45°, -112.07°"
  );
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
    const displayName = formatCityName(result);
    const coordsText = `${result.latitude.toFixed(2)}°, ${result.longitude.toFixed(2)}°`;

    saveRecentCity(displayName);
    fetchWeather(result.latitude, result.longitude, displayName, coordsText);

    cityInput.value = "";
  } catch (error) {
    showMessage("Something went wrong while searching. Try again.");
    systemStatus.textContent = "ERROR";
  }
}

async function getCitySuggestions(city) {
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=en&format=json`;
    const response = await fetch(geoUrl);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      hideSuggestions();
      return;
    }

    suggestionResults = data.results;
    renderSuggestions();
  } catch (error) {
    hideSuggestions();
  }
}

function renderSuggestions() {
  citySuggestions.innerHTML = "";

  suggestionResults.forEach(function (city) {
    const button = document.createElement("button");
    button.className = "city-suggestion";
    button.type = "button";

    const cityLabel = formatCityName(city);
    const countryLabel = city.country || "Unknown country";

    button.innerHTML = `
      ${escapeHTML(cityLabel)}
      <small>${escapeHTML(countryLabel)}</small>
    `;

    button.addEventListener("click", function () {
      const coordsText = `${city.latitude.toFixed(2)}°, ${city.longitude.toFixed(2)}°`;

      cityInput.value = "";
      hideSuggestions();

      saveRecentCity(cityLabel);
      fetchWeather(city.latitude, city.longitude, cityLabel, coordsText);
    });

    citySuggestions.appendChild(button);
  });

  citySuggestions.classList.add("show");
}

function hideSuggestions() {
  citySuggestions.classList.remove("show");
  citySuggestions.innerHTML = "";
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

    const weatherInfo = getWeatherInfo(data.current.weather_code);

    updateCurrentWeather(data, displayName, coordsText, weatherInfo);
    updateForecast(data);
    updateLocationBackground(displayName, weatherInfo.label);
    hideMessage();

    systemStatus.textContent = "LIVE";
  } catch (error) {
    showMessage("Weather data could not be loaded. Check your connection and try again.");
    systemStatus.textContent = "ERROR";
  }
}

function updateCurrentWeather(data, displayName, coordsText, weatherInfo) {
  const current = data.current;
  const daily = data.daily;

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

async function updateLocationBackground(displayName, weatherLabel) {
  const hasUnsplashKey =
    UNSPLASH_ACCESS_KEY &&
    !UNSPLASH_ACCESS_KEY.includes("PASTE") &&
    UNSPLASH_ACCESS_KEY.length > 10;

  if (!hasUnsplashKey) {
    useFallbackBackground();
    return;
  }

  try {
    const backgroundQuery = getBackgroundQuery(displayName, weatherLabel);

    const imageUrl =
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(backgroundQuery)}` +
      `&orientation=landscape&per_page=1&content_filter=high&client_id=${UNSPLASH_ACCESS_KEY}`;

    const response = await fetch(imageUrl);

    if (!response.ok) {
      useFallbackBackground();
      return;
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      useFallbackBackground();
      return;
    }

    const photo = data.results[0];
    const photoUrl = photo.urls.regular;
    const photographerName = photo.user.name;
    const photographerUrl = `${photo.user.links.html}?utm_source=joel_weather_dashboard&utm_medium=referral`;
    const unsplashUrl = `https://unsplash.com/?utm_source=joel_weather_dashboard&utm_medium=referral`;

    document.body.style.setProperty("--hero-image", `url("${photoUrl}")`);
    document.body.classList.add("location-photo-active");

    backgroundCredit.innerHTML = `
      Photo by
      <a href="${photographerUrl}" target="_blank" rel="noopener noreferrer">${escapeHTML(photographerName)}</a>
      on
      <a href="${unsplashUrl}" target="_blank" rel="noopener noreferrer">Unsplash</a>
    `;

    backgroundCredit.classList.remove("hidden");
  } catch (error) {
    useFallbackBackground();
  }
}

function getBackgroundQuery(displayName, weatherLabel) {
  if (displayName.toLowerCase().includes("local weather")) {
    return `${weatherLabel} weather landscape`;
  }

  const cityOnly = displayName.split(",")[0].trim();

  return `${cityOnly} city skyline`;
}

function useFallbackBackground() {
  document.body.classList.remove("location-photo-active");
  document.body.style.setProperty("--hero-image", "none");

  backgroundCredit.textContent = "";
  backgroundCredit.classList.add("hidden");
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

function formatCityName(city) {
  return `${city.name}${city.admin1 ? ", " + city.admin1 : ""}`;
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

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

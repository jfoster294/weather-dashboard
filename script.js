const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const message = document.getElementById("message");
const suggestions = document.getElementById("suggestions");
const themeSelect = document.getElementById("themeSelect");

const weatherCard = document.getElementById("weatherCard");
const cityName = document.getElementById("cityName");
const condition = document.getElementById("condition");
const temperature = document.getElementById("temperature");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");

const forecastSection = document.getElementById("forecastSection");
const forecastGrid = document.getElementById("forecastGrid");

let typingTimer;
let selectedLocation = null;
let currentWeatherCode = null;

const themeClasses = [
  "theme-glass",
  "theme-cyber",
  "theme-apple",
  "theme-mood",
  "theme-passport",
  "theme-luxury",
  "theme-nature"
];

const moodClasses = [
  "mood-clear",
  "mood-cloudy",
  "mood-rain",
  "mood-snow",
  "mood-storm",
  "mood-fog"
];

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

themeSelect.addEventListener("change", function () {
  applyTheme(themeSelect.value);
});

cityInput.addEventListener("input", function () {
  clearTimeout(typingTimer);
  selectedLocation = null;

  const searchText = cityInput.value.trim();

  if (searchText.length < 2) {
    hideSuggestions();
    return;
  }

  typingTimer = setTimeout(function () {
    getLocationSuggestions(searchText);
  }, 300);
});

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const searchText = cityInput.value.trim();

  if (searchText === "") {
    showMessage("Please enter a city or location.");
    return;
  }

  hideSuggestions();

  if (selectedLocation) {
    getWeatherByLocation(selectedLocation);
  } else {
    getWeatherBySearch(searchText);
  }
});

document.addEventListener("click", function (event) {
  if (!event.target.closest(".search-form")) {
    hideSuggestions();
  }
});

function applyTheme(theme) {
  document.body.classList.remove(...themeClasses);
  document.body.classList.remove(...moodClasses);

  document.body.classList.add(`theme-${theme}`);
  localStorage.setItem("selectedTheme", theme);

  if (theme === "mood" && currentWeatherCode !== null) {
    applyWeatherMood(currentWeatherCode);
  }
}

function applyWeatherMood(weatherCode) {
  document.body.classList.remove(...moodClasses);

  if (weatherCode === 0 || weatherCode === 1) {
    document.body.classList.add("mood-clear");
  } else if (weatherCode === 2 || weatherCode === 3) {
    document.body.classList.add("mood-cloudy");
  } else if (weatherCode === 45 || weatherCode === 48) {
    document.body.classList.add("mood-fog");
  } else if (weatherCode >= 51 && weatherCode <= 65) {
    document.body.classList.add("mood-rain");
  } else if (weatherCode >= 71 && weatherCode <= 75) {
    document.body.classList.add("mood-snow");
  } else if (weatherCode >= 80 && weatherCode <= 82) {
    document.body.classList.add("mood-rain");
  } else if (weatherCode === 95) {
    document.body.classList.add("mood-storm");
  } else {
    document.body.classList.add("mood-cloudy");
  }
}

async function getLocationSuggestions(searchText) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchText)}&count=10&language=en&format=json`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      hideSuggestions();
      return;
    }

    displaySuggestions(data.results);
  } catch (error) {
    hideSuggestions();
  }
}

function displaySuggestions(locations) {
  suggestions.innerHTML = "";

  locations.forEach(function (location) {
    const item = document.createElement("div");
    item.className = "suggestion-item";

    const name = document.createElement("div");
    name.className = "suggestion-name";
    name.textContent = location.name;

    const place = document.createElement("div");
    place.className = "suggestion-location";
    place.textContent = getLocationLabel(location);

    item.appendChild(name);
    item.appendChild(place);

    item.addEventListener("click", function () {
      selectedLocation = location;
      cityInput.value = getLocationLabel(location);
      hideSuggestions();
      getWeatherByLocation(location);
    });

    suggestions.appendChild(item);
  });

  suggestions.classList.remove("hidden");
}

function getLocationLabel(location) {
  const region = location.admin1 ? `${location.admin1}, ` : "";
  const country = location.country ? location.country : "";

  return `${location.name}, ${region}${country}`;
}

function hideSuggestions() {
  suggestions.innerHTML = "";
  suggestions.classList.add("hidden");
}

async function getWeatherBySearch(searchText) {
  try {
    showMessage("Loading weather...");
    weatherCard.classList.add("hidden");
    forecastSection.classList.add("hidden");

    const location = await getCityLocation(searchText);
    await getWeatherByLocation(location);
  } catch (error) {
    showMessage(error.message);
  }
}

async function getWeatherByLocation(location) {
  try {
    showMessage("Loading weather...");
    weatherCard.classList.add("hidden");
    forecastSection.classList.add("hidden");

    const weather = await getWeatherData(location);

    displayCurrentWeather(location, weather);
    displayForecast(weather);

    localStorage.setItem("lastLocation", JSON.stringify(location));

    showMessage("");
  } catch (error) {
    showMessage("Weather data could not be loaded.");
  }
}

async function getCityLocation(searchText) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchText)}&count=1&language=en&format=json`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("Location not found. Try another search.");
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

  currentWeatherCode = current.weather_code;

  if (themeSelect.value === "mood") {
    applyWeatherMood(currentWeatherCode);
  }

  cityName.textContent = getLocationLabel(location);
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
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function showMessage(text) {
  message.textContent = text;
}

const savedTheme = localStorage.getItem("selectedTheme") || "glass";
themeSelect.value = savedTheme;
applyTheme(savedTheme);

const savedLocation = localStorage.getItem("lastLocation");

if (savedLocation) {
  try {
    const location = JSON.parse(savedLocation);
    cityInput.value = getLocationLabel(location);
    getWeatherByLocation(location);
  } catch (error) {
    localStorage.removeItem("lastLocation");
  }
}

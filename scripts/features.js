// ===== GLOBAL STATE =====
const weatherApp = {
  apiKey: "b1fd6e14799699504191b6bdbcadfc35",
  currentUnit: localStorage.getItem('temperatureUnit') || 'celsius',
  currentTheme: localStorage.getItem('theme') || 'auto',
  favorites: JSON.parse(localStorage.getItem('favoriteCities')) || [],
  searchHistory: JSON.parse(localStorage.getItem('searchHistory')) || [],
  currentCity: null,
  currentWeatherData: null,
  hourlyChart: null
};

// ===== UTILITY FUNCTIONS =====
function convertTemperature(celsius, toUnit = weatherApp.currentUnit) {
  if (toUnit === 'fahrenheit') {
    return (celsius * 9/5) + 32;
  } else if (toUnit === 'kelvin') {
    return celsius + 273.15;
  }
  return celsius;
}

function getTemperatureSymbol() {
  if (weatherApp.currentUnit === 'celsius') return '°C';
  if (weatherApp.currentUnit === 'fahrenheit') return '°F';
  return 'K';
}

function formatTemperature(temp) {
  const converted = convertTemperature(temp);
  const symbol = weatherApp.currentUnit === 'kelvin' ? 'K' : (weatherApp.currentUnit === 'celsius' ? 'C' : 'F');
  return Math.round(converted) + '<sup>o</sup>' + symbol;
}

function showLoader(elementIds) {
  elementIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = '';
      const img = document.createElement('img');
      img.className = 'loader-img';
      img.src = 'icons/loader.gif';
      img.style.width = '40px';
      img.style.height = '40px';
      element.appendChild(img);
    }
  });
}

// ===== UNIT TOGGLE FUNCTIONALITY =====
function toggleUnit() {
  const units = ['celsius', 'fahrenheit', 'kelvin'];
  const currentIndex = units.indexOf(weatherApp.currentUnit);
  const nextIndex = (currentIndex + 1) % units.length;
  weatherApp.currentUnit = units[nextIndex];
  localStorage.setItem('temperatureUnit', weatherApp.currentUnit);
  updateUnitButton();
  
  // Update display if we have weather data
  if (weatherApp.currentWeatherData) {
    updateWeatherDisplay(weatherApp.currentWeatherData);
    if (weatherApp.currentCity) {
      fetchForecast(weatherApp.currentCity);
      fetchHourlyForecast(weatherApp.currentCity);
    }
  }
}

function updateUnitButton() {
  const unitBtn = document.getElementById('unitToggleBtn');
  if (unitBtn) {
    if (weatherApp.currentUnit === 'celsius') {
      unitBtn.textContent = '°C';
      unitBtn.title = 'Switch to Fahrenheit';
    } else if (weatherApp.currentUnit === 'fahrenheit') {
      unitBtn.textContent = '°F';
      unitBtn.title = 'Switch to Kelvin';
    } else {
      unitBtn.textContent = 'K';
      unitBtn.title = 'Switch to Celsius';
    }
  }
}

// ===== THEME FUNCTIONALITY =====
function detectSystemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const actualTheme = theme === 'auto' ? detectSystemTheme() : theme;
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(`${actualTheme}-theme`);
  
  // Update theme button icon
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    if (theme === 'auto') {
      themeBtn.textContent = '🌓';
      themeBtn.title = 'Theme: Auto (System)';
    } else if (theme === 'light') {
      themeBtn.textContent = '☀️';
      themeBtn.title = 'Theme: Light';
    } else {
      themeBtn.textContent = '🌙';
      themeBtn.title = 'Theme: Dark';
    }
  }
}

function toggleTheme() {
  const themes = ['auto', 'light', 'dark'];
  const currentIndex = themes.indexOf(weatherApp.currentTheme);
  const nextIndex = (currentIndex + 1) % themes.length;
  weatherApp.currentTheme = themes[nextIndex];
  localStorage.setItem('theme', weatherApp.currentTheme);
  applyTheme(weatherApp.currentTheme);
}

// Listen for system theme changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (weatherApp.currentTheme === 'auto') {
      applyTheme('auto');
    }
  });
}

// ===== SEARCH HISTORY FUNCTIONALITY =====
function addToSearchHistory(city) {
  if (!city) return;
  
  // Remove duplicates and add to beginning
  weatherApp.searchHistory = weatherApp.searchHistory.filter(c => 
    c.toLowerCase() !== city.toLowerCase()
  );
  weatherApp.searchHistory.unshift(city);
  
  // Keep only last 5 searches
  weatherApp.searchHistory = weatherApp.searchHistory.slice(0, 5);
  localStorage.setItem('searchHistory', JSON.stringify(weatherApp.searchHistory));
  updateSearchHistoryDisplay();
}

function updateSearchHistoryDisplay() {
  const historyContainer = document.getElementById('searchHistoryContainer');
  if (!historyContainer) return;
  
  historyContainer.innerHTML = '';
  
  if (weatherApp.searchHistory.length === 0) {
    historyContainer.classList.add('hidden');
    return;
  }
  
  historyContainer.classList.remove('hidden');
  
  weatherApp.searchHistory.forEach(city => {
    const chip = document.createElement('button');
    chip.className = 'history-chip';
    chip.textContent = city;
    chip.addEventListener('click', () => {
      loadCityWeather(city);
    });
    historyContainer.appendChild(chip);
  });
}

// ===== GEOLOCATION FUNCTIONALITY =====
function getGeolocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser');
    return;
  }

  showLoader(['locationName', 'temperatureValue', 'weatherType']);

  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude, longitude } = position.coords;
      fetchWeatherByCoords(latitude, longitude);
    },
    error => {
      console.error('Geolocation error:', error);
      document.getElementById('locationName').innerHTML = 'Unable to get location';
      alert('Unable to retrieve your location. Please allow location access or search manually.');
    }
  );
}

async function fetchWeatherByCoords(lat, lon) {
  try {
    const unit = weatherApp.currentUnit === 'celsius' ? 'metric' : 'imperial';
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApp.apiKey}&units=${unit}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.cod === 200) {
      weatherApp.currentCity = data.name;
      weatherApp.currentWeatherData = data;
      updateWeatherDisplay(data);
      fetchForecast(data.name);
      fetchHourlyForecast(data.name);
      fetchAirQuality(lat, lon);
      addToSearchHistory(data.name);
      updateDynamicBackground(data.weather[0].main, data.sys);
      
      // Update search input
      const searchCity = document.getElementById('searchCity');
      const mobileSearchCity = document.getElementById('mobileSearchCity');
      if (searchCity) searchCity.value = data.name;
      if (mobileSearchCity) mobileSearchCity.value = data.name;
    }
  } catch (error) {
    console.error('Error fetching weather:', error);
    document.getElementById('locationName').innerHTML = 'Error fetching weather';
  }
}

// ===== FAVORITES FUNCTIONALITY =====
function toggleFavorite() {
  if (!weatherApp.currentCity) {
    alert('Please search for a city first');
    return;
  }

  const cityIndex = weatherApp.favorites.findIndex(city => 
    city.toLowerCase() === weatherApp.currentCity.toLowerCase()
  );

  if (cityIndex > -1) {
    // Remove from favorites
    weatherApp.favorites.splice(cityIndex, 1);
  } else {
    // Add to favorites
    weatherApp.favorites.push(weatherApp.currentCity);
  }

  localStorage.setItem('favoriteCities', JSON.stringify(weatherApp.favorites));
  updateFavoriteButton();
  updateFavoritesDisplay();
}

function updateFavoriteButton() {
  const favoriteBtn = document.getElementById('favoriteBtn');
  if (!favoriteBtn) return;

  const isFavorite = weatherApp.favorites.some(city => 
    city.toLowerCase() === weatherApp.currentCity?.toLowerCase()
  );

  favoriteBtn.textContent = isFavorite ? '★' : '☆';
  favoriteBtn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
}

function updateFavoritesDisplay() {
  const favoritesSection = document.getElementById('favoritesSection');
  const favoritesContainer = document.getElementById('favoritesContainer');
  
  if (!favoritesContainer) return;

  if (weatherApp.favorites.length === 0) {
    favoritesSection.classList.add('hidden');
    return;
  }

  favoritesSection.classList.remove('hidden');
  favoritesContainer.innerHTML = '';

  weatherApp.favorites.forEach(city => {
    const cityCard = document.createElement('div');
    cityCard.className = 'favorite-city-card';
    cityCard.innerHTML = `
      <span class="favorite-city-name">${city}</span>
      <button class="remove-favorite-btn" data-city="${city}" title="Remove">×</button>
    `;
    
    cityCard.querySelector('.favorite-city-name').addEventListener('click', () => {
      loadCityWeather(city);
    });

    cityCard.querySelector('.remove-favorite-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      removeFavorite(city);
    });

    favoritesContainer.appendChild(cityCard);
  });
}

function removeFavorite(city) {
  weatherApp.favorites = weatherApp.favorites.filter(fav => 
    fav.toLowerCase() !== city.toLowerCase()
  );
  localStorage.setItem('favoriteCities', JSON.stringify(weatherApp.favorites));
  updateFavoriteButton();
  updateFavoritesDisplay();
}

function loadCityWeather(city) {
  const searchInput = document.getElementById('searchCity');
  if (searchInput) {
    searchInput.value = city;
    // Trigger the search
    const event = new KeyboardEvent('keyup', { key: 'Enter' });
    searchInput.dispatchEvent(event);
  }
}

// ===== AIR QUALITY FUNCTIONALITY =====
async function fetchAirQuality(lat, lon) {
  try {
    const apiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${weatherApp.apiKey}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.list && data.list.length > 0) {
      const aqi = data.list[0].main.aqi;
      const aqiElement = document.querySelector('.air-quality-index-additional-value');
      
      if (aqiElement) {
        const aqiLabels = {
          1: { text: 'Good', color: '#00e400', bg: 'rgba(0, 228, 0, 0.2)' },
          2: { text: 'Fair', color: '#ffff00', bg: 'rgba(255, 255, 0, 0.2)' },
          3: { text: 'Moderate', color: '#ff7e00', bg: 'rgba(255, 126, 0, 0.2)' },
          4: { text: 'Poor', color: '#ff0000', bg: 'rgba(255, 0, 0, 0.2)' },
          5: { text: 'Very Poor', color: '#8f3f97', bg: 'rgba(143, 63, 151, 0.2)' }
        };
        
        const aqiInfo = aqiLabels[aqi] || aqiLabels[2];
        aqiElement.textContent = aqiInfo.text;
        aqiElement.style.color = aqiInfo.color;
        aqiElement.style.backgroundColor = aqiInfo.bg;
        aqiElement.style.padding = '4px 8px';
        aqiElement.style.borderRadius = '4px';
        aqiElement.style.fontWeight = '600';
      }
    }
  } catch (error) {
    console.error('Error fetching air quality:', error);
  }
}

// ===== HOURLY FORECAST FUNCTIONALITY =====
async function fetchHourlyForecast(cityName) {
  try {
    const unit = weatherApp.currentUnit === 'celsius' ? 'metric' : 'imperial';
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${weatherApp.apiKey}&units=${unit}`);
    const data = await response.json();
    
    if (data.cod === '200') {
      displayHourlyChart(data);
    }
  } catch (error) {
    console.error('Error fetching hourly forecast:', error);
  }
}

function displayHourlyChart(data) {
  const canvas = document.getElementById('hourlyChart');
  if (!canvas) return;
  
  // Take first 8 entries (24 hours with 3-hour intervals)
  const hourlyData = data.list.slice(0, 8);
  
  const labels = hourlyData.map(entry => {
    const date = new Date(entry.dt * 1000);
    return date.toLocaleTimeString('en-US', { hour: 'numeric' });
  });
  
  const temperatures = hourlyData.map(entry => {
    return Math.round(convertTemperature(entry.main.temp));
  });
  
  const precipitation = hourlyData.map(entry => {
    return entry.pop * 100; // Probability of precipitation
  });
  
  // Destroy previous chart if it exists
  if (weatherApp.hourlyChart) {
    weatherApp.hourlyChart.destroy();
  }
  
  const ctx = canvas.getContext('2d');
  weatherApp.hourlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: `Temperature (${getTemperatureSymbol()})`,
          data: temperatures,
          borderColor: 'rgba(255, 159, 64, 1)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y'
        },
        {
          label: 'Precipitation (%)',
          data: precipitation,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: 'rgba(255, 255, 255, 0.9)',
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.8)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          type: 'linear',
          position: 'left',
          ticks: {
            color: 'rgba(255, 159, 64, 1)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y1: {
          type: 'linear',
          position: 'right',
          ticks: {
            color: 'rgba(54, 162, 235, 1)'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

// ===== DYNAMIC BACKGROUND FUNCTIONALITY =====
function updateDynamicBackground(weatherCondition, sysData) {
  const currentTime = Date.now() / 1000;
  const isNight = currentTime < sysData.sunrise || currentTime > sysData.sunset;
  
  let backgroundCategory = 'day';
  
  if (isNight) {
    backgroundCategory = 'night';
  } else if (weatherCondition.toLowerCase().includes('rain') || 
             weatherCondition.toLowerCase().includes('drizzle') || 
             weatherCondition.toLowerCase().includes('thunderstorm')) {
    backgroundCategory = 'rainy';
  } else if (weatherCondition.toLowerCase().includes('cloud')) {
    backgroundCategory = 'cloudy';
  }
  
  const backgrounds = {
    day: ['day1.jpg', 'day2.jpg', 'day3.jpg', 'day4.jpg', 'day5.jpg'],
    night: ['night1.jpg', 'night2.jpg', 'night3.jpg', 'night4.jpg', 'night5.jpg'],
    rainy: ['rainy1.jpg', 'rainy2.jpg', 'rainy3.jpg', 'rainy4.jpg', 'rainy5.jpg'],
    cloudy: ['cloudy1.jpg', 'cloudy2.jpg', 'cloudy3.jpg', 'cloudy4.jpg', 'cloudy5.jpg']
  };
  
  const selectedBackgrounds = backgrounds[backgroundCategory];
  const randomBg = selectedBackgrounds[Math.floor(Math.random() * selectedBackgrounds.length)];
  
  document.body.style.transition = 'background 0.5s ease-in-out';
  document.body.style.background = `linear-gradient(rgba(0, 0, 0, 0.5),rgba(0, 0, 0, 0.5)), url('media/${randomBg}')`;
}

// ===== WEATHER DISPLAY =====
function updateWeatherDisplay(data) {
  weatherApp.currentCity = data.name;
  weatherApp.currentWeatherData = data;

  const tempUnit = weatherApp.currentUnit === 'celsius' ? data.main.temp : convertTemperature(data.main.temp, 'fahrenheit');
  const realFeelUnit = weatherApp.currentUnit === 'celsius' ? data.main.feels_like : convertTemperature(data.main.feels_like, 'fahrenheit');
  const maxTempUnit = weatherApp.currentUnit === 'celsius' ? data.main.temp_max : convertTemperature(data.main.temp_max, 'fahrenheit');
  const minTempUnit = weatherApp.currentUnit === 'celsius' ? data.main.temp_min : convertTemperature(data.main.temp_min, 'fahrenheit');

  document.getElementById('locationName').innerHTML = data.name;
  document.getElementById('temperatureValue').innerHTML = Math.round(tempUnit) + '<sup>o</sup>' + (weatherApp.currentUnit === 'celsius' ? 'C' : 'F');
  document.getElementById('weatherType').innerHTML = data.weather[0].description;
  document.getElementById('realFeelAdditionalValue').innerHTML = Math.round(realFeelUnit) + '<sup>o</sup>' + (weatherApp.currentUnit === 'celsius' ? 'C' : 'F');
  document.getElementById('windSpeedAdditionalValue').innerHTML = Math.round(data.wind.speed) + ' km/h';
  document.getElementById('windDirectionAdditionalValue').innerHTML = data.wind.deg + '°';
  document.getElementById('visibilityAdditionalValue').innerHTML = (data.visibility / 1000).toFixed(1) + ' km';
  document.getElementById('pressureAdditionalValue').innerHTML = data.main.pressure + ' hPa';
  document.getElementById('maxTemperatureAdditionalValue').innerHTML = Math.round(maxTempUnit) + '<sup>o</sup>' + (weatherApp.currentUnit === 'celsius' ? 'C' : 'F');
  document.getElementById('minTemperatureAdditionalValue').innerHTML = Math.round(minTempUnit) + '<sup>o</sup>' + (weatherApp.currentUnit === 'celsius' ? 'C' : 'F');
  document.getElementById('humidityAdditionalValue').innerHTML = data.main.humidity + '%';
  
  // Format sunrise and sunset
  const sunriseTime = new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const sunsetTime = new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('sunriseAdditionalValue').innerHTML = sunriseTime;
  document.getElementById('sunsetAdditionalValue').innerHTML = sunsetTime;

  updateFavoriteButton();
}

async function fetchForecast(cityName) {
  try {
    const unit = weatherApp.currentUnit === 'celsius' ? 'metric' : 'imperial';
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${weatherApp.apiKey}&units=${unit}`);
    const data = await response.json();

    if (data.cod === '200') {
      displayForecast(data);
    }
  } catch (error) {
    console.error('Error fetching forecast:', error);
  }
}

function displayForecast(data) {
  const forecastContainer = document.getElementById('forecast-container');
  if (!forecastContainer) return;

  forecastContainer.innerHTML = '';

  // Group forecasts by day (take one per day, around noon)
  const dailyForecasts = [];
  const processedDates = new Set();

  data.list.forEach(entry => {
    const date = new Date(entry.dt * 1000);
    const dateString = date.toDateString();
    
    // Take the forecast closest to noon for each day
    if (!processedDates.has(dateString) && dailyForecasts.length < 5) {
      processedDates.add(dateString);
      dailyForecasts.push(entry);
    }
  });

  dailyForecasts.forEach(day => {
    const date = new Date(day.dt * 1000);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    const temp = Math.round(day.main.temp);
    const tempMin = Math.round(day.main.temp_min);
    const icon = day.weather[0].icon;
    const description = day.weather[0].main;

    const forecastCard = document.createElement('div');
    forecastCard.classList.add('daily-forecast-card');
    forecastCard.innerHTML = `
      <p class="daily-forecast-date">${dateStr}</p>
      <div class="daily-forecast-logo">
        <img class="imgs-as-icons" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}">
      </div>
      <div class="max-min-temperature-daily-forecast">
        <span class="max-daily-forecast">${temp}<sup>o</sup>${weatherApp.currentUnit === 'celsius' ? 'C' : 'F'}</span>
        <span class="min-daily-forecast">${tempMin}<sup>o</sup>${weatherApp.currentUnit === 'celsius' ? 'C' : 'F'}</span>
      </div>
      <p class="weather-type-daily-forecast">${description}</p>
    `;
    forecastContainer.appendChild(forecastCard);
  });
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
  // Initialize theme
  applyTheme(weatherApp.currentTheme);
  
  // Initialize unit button
  updateUnitButton();
  
  // Initialize favorites display
  updateFavoritesDisplay();
  
  // Initialize search history display
  updateSearchHistoryDisplay();

  // Event listeners for new buttons
  const geolocationBtn = document.getElementById('geolocationBtn');
  if (geolocationBtn) {
    geolocationBtn.addEventListener('click', getGeolocation);
  }

  const unitToggleBtn = document.getElementById('unitToggleBtn');
  if (unitToggleBtn) {
    unitToggleBtn.addEventListener('click', toggleUnit);
  }
  
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  const favoriteBtn = document.getElementById('favoriteBtn');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', toggleFavorite);
  }

  // Auto-detect location on first load if no favorites and no previous search
  const hasSearched = localStorage.getItem('hasSearched');
  if (!hasSearched && weatherApp.favorites.length === 0 && weatherApp.searchHistory.length === 0) {
    setTimeout(() => {
      getGeolocation();
      localStorage.setItem('hasSearched', 'true');
    }, 500);
  }
});

// Export functions for use in other scripts
window.weatherApp = weatherApp;
window.updateWeatherDisplay = updateWeatherDisplay;
window.fetchForecast = fetchForecast;

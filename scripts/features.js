// ===== GLOBAL STATE =====
const weatherApp = {
  apiKey: "b1fd6e14799699504191b6bdbcadfc35",
  currentUnit: localStorage.getItem('temperatureUnit') || 'celsius',
  favorites: JSON.parse(localStorage.getItem('favoriteCities')) || [],
  currentCity: null,
  currentWeatherData: null
};

// ===== UTILITY FUNCTIONS =====
function convertTemperature(celsius, toUnit = weatherApp.currentUnit) {
  if (toUnit === 'fahrenheit') {
    return (celsius * 9/5) + 32;
  }
  return celsius;
}

function getTemperatureSymbol() {
  return weatherApp.currentUnit === 'celsius' ? '°C' : '°F';
}

function formatTemperature(temp) {
  const converted = convertTemperature(temp);
  return Math.round(converted) + '<sup>o</sup>' + (weatherApp.currentUnit === 'celsius' ? 'C' : 'F');
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
  weatherApp.currentUnit = weatherApp.currentUnit === 'celsius' ? 'fahrenheit' : 'celsius';
  localStorage.setItem('temperatureUnit', weatherApp.currentUnit);
  updateUnitButton();
  
  // Update display if we have weather data
  if (weatherApp.currentWeatherData) {
    updateWeatherDisplay(weatherApp.currentWeatherData);
  }
}

function updateUnitButton() {
  const unitBtn = document.getElementById('unitToggleBtn');
  if (unitBtn) {
    unitBtn.textContent = weatherApp.currentUnit === 'celsius' ? '°C' : '°F';
    unitBtn.title = `Switch to ${weatherApp.currentUnit === 'celsius' ? 'Fahrenheit' : 'Celsius'}`;
  }
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
    favoritesSection.style.display = 'none';
    return;
  }

  favoritesSection.style.display = 'block';
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
  // Initialize unit button
  updateUnitButton();
  
  // Initialize favorites display
  updateFavoritesDisplay();

  // Event listeners for new buttons
  const geolocationBtn = document.getElementById('geolocationBtn');
  if (geolocationBtn) {
    geolocationBtn.addEventListener('click', getGeolocation);
  }

  const unitToggleBtn = document.getElementById('unitToggleBtn');
  if (unitToggleBtn) {
    unitToggleBtn.addEventListener('click', toggleUnit);
  }

  const favoriteBtn = document.getElementById('favoriteBtn');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', toggleFavorite);
  }

  // Auto-detect location on first load if no favorites
  const hasSearched = localStorage.getItem('hasSearched');
  if (!hasSearched && weatherApp.favorites.length === 0) {
    setTimeout(() => {
      if (confirm('Would you like to use your current location to get weather?')) {
        getGeolocation();
        localStorage.setItem('hasSearched', 'true');
      }
    }, 1000);
  }
});

// Export functions for use in other scripts
window.weatherApp = weatherApp;
window.updateWeatherDisplay = updateWeatherDisplay;
window.fetchForecast = fetchForecast;

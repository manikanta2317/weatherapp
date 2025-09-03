import React, { useState, useEffect } from 'react';
import './App.css';

const weatherIcons = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  56: '🌧️', 57: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  66: '🌧️', 67: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️', 77: '❄️',
  80: '🌧️', 81: '🌧️', 82: '🌧️',
  85: '❄️', 86: '❄️',
  95: '⛈️', 96: '⛈️', 99: '⛈️'
};

function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [cityName, setCityName] = useState('');
  const [hourly, setHourly] = useState({ time: [], temperature: [], code: [] });
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    handleCurrentLocation();
  }, []);

  const fetchWeather = async (lat, lon, name = '') => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch weather data.');
      }
      const data = await res.json();

      setWeather(data.current_weather);
      setForecast(data.daily);
      setCityName(name);

      setHourly({
        time: data.hourly.time,
        temperature: data.hourly.temperature_2m,
        code: data.hourly.weathercode
      });
      
      if (data.daily.time && data.daily.time.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayIndex = data.daily.time.indexOf(todayStr);
        if (todayIndex !== -1) {
          setSelectedDay(data.daily.time[todayIndex]);
        } else {
          setSelectedDay(data.daily.time[0]);
        }
      }

    } catch (err) {
      console.error("Weather fetching error:", err);
      setError("Failed to get weather data. Please try again later.");
      setWeather(null);
      setForecast([]);
      setHourly({ time: [], temperature: [], code: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!city) return;

    setLoading(true);
    setError(null);
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`;
      const res = await fetch(geoUrl);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const { latitude, longitude, name } = data.results[0];
        fetchWeather(latitude, longitude, name);
      } else {
        setError("City not found. Please try another search.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Geocoding error:", err);
      setError("Failed to find city. Please check your spelling.");
      setLoading(false);
    }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeather(pos.coords.latitude, pos.coords.longitude, 'My Location');
        },
        (error) => {
          console.error("Geolocation error:", error);
          setError("Unable to retrieve your location. Please enter a city manually.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };
  
  const getDisplayDayName = (dateStr, index) => {
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (index === 0) return `Today, ${formattedDate}`;
    return `${dayName}, ${formattedDate}`;
  };

  const getHourlyForDay = (dateStr) => {
    return hourly.time
      .map((t, i) => ({ time: t, temp: hourly.temperature[i], code: hourly.code[i] }))
      .filter((h) => h.time.startsWith(dateStr));
  };

  const getFiveDayForecast = () => {
    if (!forecast.time || forecast.time.length === 0) {
      return [];
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const startIndex = forecast.time.indexOf(todayStr);

    if (startIndex === -1 || startIndex > forecast.time.length - 5) {
      return forecast.time.slice(0, 5);
    }
    return forecast.time.slice(startIndex, startIndex + 5);
  };

  return (
    <div className="app-container">
      <div className="app">
        <header className="app-header">
          <h1>🌤️ Weather App</h1>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Enter city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <button type="submit">Search</button>
            <button type="button" onClick={handleCurrentLocation}>📍 My Location</button>
          </form>
        </header>

        {loading && <p className="status-message">Loading...</p>}
        {error && <p className="status-message error-message">{error}</p>}

        {!loading && !error && weather && (
          <div className="current-weather">
            <h2>Current Weather in {cityName}</h2>
            <div className="weather-main-info">
              <div className="weather-icon">
                {weatherIcons[weather.weathercode] || '❔'}
              </div>
              <div className="weather-details">
                <p className="temperature">{weather.temperature}°C</p>
                <p>Windspeed: {weather.windspeed} km/h</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && forecast.time && (
          <div className="forecast-section">
            <h2>5-Day Forecast</h2>
            <div className="forecast-container">
              {getFiveDayForecast().map((day, idx) => {
                const dayIndexInForecast = forecast.time.indexOf(day);
                return (
                  <div
                    key={day}
                    className={`forecast-card ${selectedDay === day ? 'selected' : ''}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    <p className="day-name">{getDisplayDayName(day, idx)}</p>
                    <div className="day-icon">
                      {weatherIcons[forecast.weathercode[dayIndexInForecast]] || '❔'}
                    </div>
                    <p className="temp-range">
                      {Math.round(forecast.temperature_2m_min[dayIndexInForecast])}°C / {Math.round(forecast.temperature_2m_max[dayIndexInForecast])}°C
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && !error && selectedDay && hourly.time.length > 0 && (
          <div className="hourly-section">
            <h2>Hourly Forecast for {getDisplayDayName(selectedDay, getFiveDayForecast().indexOf(selectedDay))}</h2>
            <div className="hourly-container">
              {getHourlyForDay(selectedDay).map((h, idx) => (
                <div key={idx} className="hourly-card">
                  <p className="hourly-time">{new Date(h.time).getHours()}:00</p>
                  <div className="hourly-icon">
                    {weatherIcons[h.code] || '❔'}
                  </div>
                  <p className="hourly-temp">{Math.round(h.temp)}°C</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && !weather && (
          <p className="welcome-message">Search for a city or use your current location to get the weather forecast.</p>
        )}
      </div>
    </div>
  );
}

export default App;
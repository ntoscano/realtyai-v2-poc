import type { WeatherContext } from './graphState';

/**
 * OpenWeatherMap API response types
 */
type OpenWeatherMapResponse = {
	main: {
		temp: number;
	};
	weather: Array<{
		main: string;
		description: string;
	}>;
};

/**
 * Fetches weather data for a given city and state using OpenWeatherMap API.
 *
 * @param city - The city name
 * @param state - The US state code (e.g., "TX", "CA")
 * @returns Weather context object with condition, temperature, and summary, or null on failure
 */
export async function fetchWeather(
	city: string,
	state: string,
): Promise<WeatherContext> {
	const apiKey = process.env.OPENWEATHERMAP_API_KEY;

	if (!apiKey) {
		console.warn('OPENWEATHERMAP_API_KEY not configured');
		return null;
	}

	try {
		// Build the query with city, state, and country code (US)
		const query = encodeURIComponent(`${city},${state},US`);
		const url = `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${apiKey}&units=imperial`;

		const response = await fetch(url);

		if (!response.ok) {
			console.warn(
				`Weather API returned ${response.status} for ${city}, ${state}`,
			);
			return null;
		}

		const data: OpenWeatherMapResponse = await response.json();

		// Extract weather information
		const condition = data.weather[0]?.main || 'Unknown';
		const description = data.weather[0]?.description || 'unknown conditions';
		const temperature = Math.round(data.main.temp);

		return {
			condition,
			temperature,
			short_summary: `${temperature}°F with ${description}`,
		};
	} catch (error) {
		console.warn(`Failed to fetch weather for ${city}, ${state}:`, error);
		return null;
	}
}

import type { WeatherContext } from './graphState';

/**
 * WeatherAPI.com response type
 */
type WeatherAPIResponse = {
	current: {
		temp_f: number;
		condition: {
			text: string;
		};
	};
};

/**
 * Fetches weather data using WeatherAPI.com
 */
export async function fetchWeather(
	city: string,
	state: string,
): Promise<WeatherContext> {
	const apiKey = process.env.WEATHERAPI_KEY;

	if (!apiKey) {
		console.error('[Weather] WEATHERAPI_KEY not configured');
		return null;
	}

	try {
		const query = encodeURIComponent(`${city}, ${state}`);
		const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${query}&aqi=no`;

		console.log(`[Weather] Fetching weather for ${city}, ${state}`);
		const response = await fetch(url);

		if (!response.ok) {
			const errorBody = await response.text();
			console.error(`[Weather] API error ${response.status}: ${errorBody}`);
			return null;
		}

		const data: WeatherAPIResponse = await response.json();

		const temperature = Math.round(data.current.temp_f);
		const condition = data.current.condition.text;

		console.log(`[Weather] Success: ${temperature}°F, ${condition}`);

		return {
			condition,
			temperature,
			short_summary: `${temperature}°F with ${condition.toLowerCase()}`,
		};
	} catch (error) {
		console.error(`[Weather] Failed to fetch:`, error);
		return null;
	}
}

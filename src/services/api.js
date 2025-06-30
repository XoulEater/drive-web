const API_BASE_URL = 'http://localhost:3001';

class ApiService {
  async getData() {
    try {
      const response = await fetch(`${API_BASE_URL}/driveWebData`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching data:', error);
      return {};
    }
  }

  async saveData(data) {
    try {
      const response = await fetch(`${API_BASE_URL}/driveWebData`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving data:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();

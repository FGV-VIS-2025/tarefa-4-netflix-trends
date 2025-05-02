// sharedStore.js
import { writable, get } from 'svelte/store';

// Stores for clicked items
export const clickedYearsStore = writable([])
export const clickedAgesStore = writable([])

function createSharedStore() {
    // Separate writable store for movie data
    const movieDataStore = writable([])
    
    // The core store holds the computed data for components
    const storeData = writable({
        yearData: [],
        ageData: []
    });

    // Return a store with custom methods that can be called from any component
    const store = {
        // Standard subscribe method for reactive updates
        subscribe: storeData.subscribe,
        
        // Direct access to movieData store for components
        movieData: movieDataStore,
        
        // Expose method to set movie data
        setMovieData: (data) => {
            movieDataStore.set(data);
            // Initial processing after data is loaded
            store.processYearData();
            store.processAgeData();
        },
        
        // Getter/setter for clickedYears
        get clickedYears() {
            return get(clickedYearsStore);
        },
        set clickedYears(years) {
            clickedYearsStore.set(years);
        },
        
        // Getter/setter for clickedAges
        get clickedAges() {
            return get(clickedAgesStore);
        },
        set clickedAges(ages) {
            clickedAgesStore.set(ages);
        },
        
        // Subscribe to clicked years/ages changes
        subscribeToClickedYears: clickedYearsStore.subscribe,
        subscribeToClickedAges: clickedAgesStore.subscribe,
        
        // Process year data with optional age filter
        processYearData: (ageFilter = null) => {
            const movieData = get(movieDataStore);
            
            if (!movieData || movieData.length === 0) {
                return; // No data to process yet
            }
            
            const releaseYearCounts = {};
            
            // Filter data based on selected age certifications if provided
            const dataToProcess = ageFilter && ageFilter.length > 0
                ? movieData.filter(item => ageFilter.includes(item.age_certification))
                : movieData;
            
            dataToProcess.forEach(item => {
                if (item.release_year) {
                    releaseYearCounts[item.release_year] = (releaseYearCounts[item.release_year] || 0) + 1;
                }
            });
            
            // Convert to array format for D3
            const yearData = Object.entries(releaseYearCounts).map(([release_year, count]) => ({
                release_year,
                count: Number(count),
            }));
            
            // Update the store with the new data
            storeData.update(state => ({
                ...state,
                yearData
            }));
        },
        
        // Process age data with optional year filter
        processAgeData: (yearFilter = null) => {
            const movieData = get(movieDataStore);
            
            if (!movieData || movieData.length === 0) {
                return; // No data to process yet
            }
            
            const ageCounts = {};
            
            const dataToProcess = yearFilter && yearFilter.length > 0
                ? movieData.filter(item => yearFilter.includes(item.release_year.toString()))
                : movieData;
                
            dataToProcess.forEach(item => {
                if (item.age_certification) {
                    ageCounts[item.age_certification] = (ageCounts[item.age_certification] || 0) + 1;
                }
            });
            
            // Convert to array format for D3
            const ageData = Object.entries(ageCounts).map(([age_certification, count]) => ({
                age_certification,
                count: Number(count),
            }));
            
            // Update the store with the new data
            storeData.update(state => ({
                ...state,
                ageData
            }));
        }
    };
    
    // Set up reactivity for filters
    clickedYearsStore.subscribe(years => {
        // When years selection changes, update age data
        if (store.processAgeData) {
            store.processAgeData(years);
        }
    });
    
    clickedAgesStore.subscribe(ages => {
        // When age selection changes, update year data
        if (store.processYearData) {
            store.processYearData(ages);
        }
    });
    
    return store;
}

// Create and export a single instance of the store
export const sharedStore = createSharedStore();
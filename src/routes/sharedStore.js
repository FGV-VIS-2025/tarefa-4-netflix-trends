// sharedStore.js
import { writable, get } from 'svelte/store';

// Stores for clicked items
export const clickedYearsStore = writable([])
export const clickedAgesStore = writable([])
export const clickedScoresStore = writable([])

function createSharedStore() {
    // Separate writable store for movie data
    const movieDataStore = writable([])
    
    // The core store holds the computed data for components
    const storeData = writable({
        yearData: [],
        ageData: [],
        scoreData: []
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
            store.processYearData(data);
            store.processAgeData(data);
            store.processScoreData(data);
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
        
        // Getter/setter for clickedScores
        get clickedScores() {
            return get(clickedScoresStore);
        },
        set clickedScores(scores) {
            clickedScoresStore.set(scores);
        },
        
        // Subscribe to clicked years/ages changes
        subscribeToClickedYears: clickedYearsStore.subscribe,
        subscribeToClickedAges: clickedAgesStore.subscribe,
        subscribeToClickedScores: clickedScoresStore.subscribe,
        
        // Process year data with optional age filter
        processYearData: (dataToProcess, ageFilter = null, scoreFilter = null) => {
            const data = dataToProcess || get(movieDataStore);
            if (!data || data.length === 0) return;
            
            let filteredData = ageFilter && ageFilter.length > 0
                ? data.filter(item => ageFilter.includes(item.age_certification))
                : data;

            filteredData = scoreFilter && scoreFilter.length > 0
                ? filteredData.filter(item => scoreFilter.includes(item.imdb_score))
                : filteredData

            const releaseYearCounts = {};
            filteredData.forEach(item => {
                if (item.release_year) {
                    releaseYearCounts[item.release_year] = (releaseYearCounts[item.release_year] || 0) + 1;
                }
            });
            const yearData = Object.entries(releaseYearCounts).map(([release_year, count]) => ({
                release_year,
                count: Number(count),
            }));
            storeData.update(state => ({ ...state, yearData }));
        },
        
        // Process age data with optional year filter
        processAgeData: (dataToProcess, yearFilter = null, scoreFilter = null) => {
            const data = dataToProcess || get(movieDataStore);
            if (!data || data.length === 0) return;
            
            let filteredData = yearFilter && yearFilter.length > 0
                ? data.filter(item => yearFilter.includes(item.release_year.toString()))
                : data;

            filteredData = scoreFilter && scoreFilter.length > 0
                ? filteredData.filter(item => scoreFilter.includes(item.imdb_score))
                : filteredData

            const ageCounts = {};
            filteredData.forEach(item => {
                if (item.age_certification) {
                    ageCounts[item.age_certification] = (ageCounts[item.age_certification] || 0) + 1;
                }
            });
            const ageData = Object.entries(ageCounts).map(([age_certification, count]) => ({
                age_certification,
                count: Number(count),
            }));
            storeData.update(state => ({ ...state, ageData }));
        },
        
        processScoreData: (dataToProcess, yearFilter = null, ageFilter = null) => {
            const data = dataToProcess || get(movieDataStore);

            if (!data || data.length === 0) return;

            let filteredData = yearFilter && yearFilter.length > 0
                ? data.filter(item => yearFilter.includes(item.release_year.toString()))
                : data;

            filteredData = ageFilter && ageFilter.length > 0
                ? filteredData.filter(item => ageFilter.includes(item.age_certification))
                : filteredData
                
            const scoreCounts = {};
            filteredData.forEach(item => {
                if (item.imdb_score) {
                    scoreCounts[item.imdb_score] = (scoreCounts[item.imdb_score] || 0) + 1;
                }
            });
            const scoreData = filteredData.map(item => item.imdb_score)
            storeData.update(state => ({ ...state, scoreData }));
        }
    };
    
    // Set up reactivity for filters
    clickedYearsStore.subscribe(years => {
        // When years selection changes, update age data
        if (store.processAgeData) {
            store.processAgeData(years);
        }
        if (store.processScoreData) {
            store.processScoreData(years);
        }
    });
    
    clickedAgesStore.subscribe(ages => {
        // When age selection changes, update year data
        if (store.processYearData) {
            store.processYearData(ages);
        }
        if (store.processScoreData) {
            store.processScoreData(ages);
        }
    });
    
    clickedScoresStore.subscribe(scores => {
        // When age selection changes, update year data
        if (store.processYearData) {
            store.processYearData(scores);
        }
        if (store.processAgeData) {
            store.processAgeData(scores);
        }
    });
    
    return store;
}

// Create and export a single instance of the store
export const sharedStore = createSharedStore();
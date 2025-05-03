<script>
  import * as d3 from 'd3';
  import { onMount } from 'svelte';
  import { computePosition, autoPlacement, offset } from '@floating-ui/dom';

  // --- Imports for the bar charts ---
  import BarplotAge from './BarplotAge.svelte';
  import BarplotYear from './BarplotYear.svelte';
  import BarplotScore from './BarplotScore.svelte';
  import {
    sharedStore,
    clickedAgesStore,
    clickedYearsStore,
    clickedScoresStore
  } from './sharedStore';
  import { get } from 'svelte/store';

  // Scatter plot variables
  let svgScatter;
  let xAxisScatter, yAxisScatter;
  let tooltipScatter;
  let movieData = [];
  let credits = [];
  let actorList = []; 
  let actorToMovies = new Map();
  let selectedActor = "";
  let searchTerm = "";
  let hoveredMovie = null;
  let cursor = { x: 0, y: 0 };
  let tooltipPosition = { x: 0, y: 0 };
  let showMovies = true;
  let showShows = true;
  let clickedMovies = [];
  let genreList = [];
  let selectedGenre = "";
  
  // All charts variables
  let width = 800, height = 500;
  let margin = { top: 20, right: 30, bottom: 50, left: 50 };
  let usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };
  
  const jitterAmount = 5;
  
  onMount(async () => {
    // Load all data
    movieData = await d3.csv('./data/titles.csv', d => ({
      id: d.id,  
      title: d.title,
      type: d.type,
      release_year: +d.release_year,
      imdb_score: +d.imdb_score,
      age_certification: d.age_certification,
      genres: d.genres ? JSON.parse(d.genres.replace(/'/g, '"')) : [],
      description: d.description || "No description available."
    }));
  
    movieData = movieData.filter(d => d.id && d.title && !isNaN(d.release_year) && !isNaN(d.imdb_score));
  
    // Setting shared movie data between bar charts
    sharedStore.setMovieData(movieData)

    // Load credits data
    credits = await d3.csv('./data/credits.csv', d => ({
      id: d.id,
      name: d.name,
      character: d.character,
      role: d.role
    }));
  
    // Build actor list
    actorList = Array.from(new Set(credits.map(d => d.name))).sort();

    // Build genre list
    genreList = Array.from(new Set(movieData.flatMap(d => d.genres))).sort();
  
    // Build actor to movies mapping
    for (const credit of credits) {
      if (credit.role !== "ACTOR") continue; // <-- só inclui atores
      if (!actorToMovies.has(credit.name)) {
        actorToMovies.set(credit.name, new Set());
      }
      actorToMovies.get(credit.name).add(credit.id);
    }
    
    // Process data for bar charts
    processAllData();

    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    
    return () => {
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
  });
  
  // Scatter plot functions
  async function dotInteraction(index, evt) {
    let hoveredDot = evt.target;
    if (evt.type === "mouseenter") {
      hoveredMovie = filteredData[index];
      cursor = { x: evt.clientX, y: evt.clientY };
      tooltipPosition = await computePosition(hoveredDot, tooltipScatter, {
        strategy: "fixed",
        middleware: [offset(5), autoPlacement()],
      });
    } else if (evt.type === "mouseleave") {
      hoveredMovie = null;
    }
  }

  function handleDotClick(index) {
    const movie = filteredData[index];
    const actors = credits.filter(c => c.id === movie.id && c.role === "ACTOR").map(c => c.name);
    const directors = credits.filter(c => c.id === movie.id && c.role === "DIRECTOR").map(c => c.name);

    if (!clickedMovies.some(m => m.id === movie.id)) {
      // Posição inicial escalonada
      const offset = clickedMovies.length * 20;
      clickedMovies = [
        ...clickedMovies,
        {
          ...movie,
          actors,
          directors,
          id: movie.id,
          position: {
            x: Math.min(80 + offset, window.innerWidth - 550), // 550 = largura estimada da janela + margem
            y: Math.min(80 + (offset / 2), window.innerHeight - 400) // 400 = altura estimada
          }
        }
      ];
    }
  }

  let draggedWindow = null;
  let offsetX = 0;
  let offsetY = 0;

  function startDrag(e, movieId) {
    draggedWindow = movieId;
    const rect = e.currentTarget.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    document.body.style.cursor = 'grabbing';
  }

  function onDrag(e) {
    if (!draggedWindow) return;
    
    e.preventDefault();
    
    clickedMovies = clickedMovies.map(movie => {
      if (movie.id === draggedWindow) {
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;
        
        // Limitar à viewport
        x = Math.max(10, Math.min(x, window.innerWidth - 510)); // 510 = largura da janela + margem
        y = Math.max(10, Math.min(y, window.innerHeight - (window.innerHeight * 0.7))); // 70vh
        
        return {
          ...movie,
          position: { x, y }
        };
      }
      return movie;
    });
  }

  function stopDrag() {
    draggedWindow = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  function bringToFront(movieId) {
    let maxZ = Math.max(...clickedMovies.map(m => m.zIndex || 999), 999);
    
    clickedMovies = clickedMovies.map(m => ({
      ...m,
      zIndex: m.id === movieId ? maxZ + 1 : m.zIndex
    }));
  }
  
  function closeMovie(movieId) {
    clickedMovies = clickedMovies.filter(m => m.id !== movieId);
  }

  $: xExtent = d3.extent(movieData, d => d.release_year);
  $: yExtent = [0, 10];
  
  $: xScale = d3.scaleLinear()
    .domain(xExtent)
    .range([usableArea.left, usableArea.right])

  
  $: yScale = d3.scaleLinear()
    .domain(yExtent)
    .range([usableArea.bottom, usableArea.top]);
  
  $: {
    if (xAxisScatter) d3.select(xAxisScatter).call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
    if (yAxisScatter) d3.select(yAxisScatter).call(d3.axisLeft(yScale));
  }
  
  $: clickedYears = $clickedYearsStore
  $: clickedAges = $clickedAgesStore
  $: clickedScores = $clickedScoresStore

  // Filter by searchTerm and selectedActor
  $: filteredData = movieData.filter(d => {
    const matchesTitle = d.title.toLowerCase().includes(searchTerm.toLowerCase());
  
    let matchesActor = true;
    if (selectedActor && actorToMovies.has(selectedActor)) {
      matchesActor = actorToMovies.get(selectedActor).has(d.id);
    }

    const matchesType = 
    (d.type === "MOVIE" && showMovies) ||
    (d.type === "SHOW" && showShows);

    const matchesGenre = !selectedGenre || d.genres.includes(selectedGenre);

    // Cross-filtering with bar charts
    const matchesYearFilter = clickedYears.length === 0 || clickedYears.includes(d.release_year.toString());
    const matchesAgeFilter = clickedAges.length === 0 || clickedAges.includes(d.age_certification);
    const matchesScoreFilter = clickedScores.length === 0 || clickedScores.includes(d.imdb_score);

    return matchesTitle && matchesActor && matchesType && matchesGenre && matchesYearFilter && matchesAgeFilter && matchesScoreFilter;
  });

  // Re-process bar chart data whenever the scatter plot filters change
  $: {
    sharedStore.processYearData(movieData, $clickedAgesStore, $clickedScoresStore);
    sharedStore.processAgeData(movieData, $clickedYearsStore, $clickedScoresStore);
    sharedStore.processScoreData(movieData, $clickedYearsStore, $clickedAgesStore);
  }

  // --- Function to process shared bar 
  function processAllData() {
    // Process the data for age certification
    sharedStore.processAgeData();
    
    // Process data for release years
    sharedStore.processYearData();
    
    // Process data for imdb score
    sharedStore.processScoreData();
  }
  
</script>

<h1>Movie Data Visualization Dashboard</h1>

<div class="dashboard">
  <section class="scatter-plot-section">
    <h2>IMDb Scores by Release Year</h2>
    
    <dl class="info tooltip" hidden={hoveredMovie === null} style="top: {tooltipPosition.y}px; left: {tooltipPosition.x}px" bind:this={tooltipScatter}>
      <dt>Title</dt>
      <dd>{hoveredMovie?.title}</dd>
      
      <dt>Year</dt>
      <dd>{hoveredMovie?.release_year}</dd>
      
      <dt>IMDb Score</dt>
      <dd>{hoveredMovie?.imdb_score}</dd>
    </dl>
    
    <div class="filters">
      <div class="filter-group">
        <input
          type="text"
          placeholder="Search movies..."
          bind:value={searchTerm}
          class="filter-input"
        />
      </div>

      <div class="filter-group">
        <input
          type="text"
          placeholder="Search actors..."
          bind:value={selectedActor}
          list="actors"
          class="filter-input"
        />
        
        <datalist id="actors">
          {#each actorList as actor}
            <option value={actor}>{actor}</option>
          {/each}
        </datalist>
      </div>

      <div class="filter-group">
        <input
          type="text"
          placeholder="Search genres..."
          bind:value={selectedGenre}
          list="genres"
          class="filter-input"
        />
        <datalist id="genres">
          {#each genreList as genre}
            <option value={genre}>{genre}</option>
          {/each}
        </datalist>
      </div>

      <label style="margin-right: 15px;">
        <input type="checkbox" bind:checked={showMovies}>
        Movies
      </label>
      
      <label>
        <input type="checkbox" bind:checked={showShows}>
        Shows
      </label>

    </div>
    
    <svg viewBox={`0 0 ${width} ${height}`} bind:this={svgScatter}>
      <g transform="translate(0, {usableArea.bottom})" bind:this={xAxisScatter} />
      <g transform="translate({usableArea.left}, 0)" bind:this={yAxisScatter} />
    
      <g class="dots">
        {#each filteredData as d, index}
          <circle
            on:mouseenter={evt => dotInteraction(index, evt)}
            on:mouseleave={evt => dotInteraction(index, evt)}
            on:click={() => handleDotClick(index)}
            cx={xScale(d.release_year) + (Math.random() - 0.5) * jitterAmount}
            cy={yScale(d.imdb_score) + (Math.random() - 0.5) * jitterAmount}
            r="4"
            fill="steelblue"
            fill-opacity="0.7"
          />
        {/each}
      </g>
    
      <text
        x={(usableArea.left + usableArea.right) / 2}
        y={height - 10}
        text-anchor="middle"
        font-size="12"
      >Release Year</text>
    
      <text
        x={-usableArea.top - usableArea.height / 2}
        y={15}
        text-anchor="middle"
        font-size="12"
        transform="rotate(-90)"
      >IMDb Score</text>
    </svg>
  </section>

  {#each clickedMovies as movie, index (movie.id)}
      <div 
        class="movie-popup" 
        style="
          left: {movie.position.x}px;
          top: {movie.position.y}px;
          z-index: {movie.zIndex || 999};
        "
        on:mousedown={(e) => {
          bringToFront(movie.id);
          startDrag(e, movie.id);
        }}
      >

      <div class="drag-handle">
        <button class="close-btn" on:click={() => closeMovie(movie.id)} title="Close">×</button>
        <h3>{movie.title} ({movie.release_year})</h3>
      </div>
      
      <div class="movie-details">
        <p><strong>Type:</strong> {movie.type === "MOVIE" ? "Movie" : "TV Show"}</p>
        <p><strong>IMDb Score:</strong> {movie.imdb_score}</p>
        <p><strong>Age Certification:</strong> {movie.age_certification || 'N/A'}</p>
        
        {#if movie.directors.length > 0}
          <p><strong>Director(s):</strong> {movie.directors.join(', ')}</p>
        {:else}
          <p><strong>Director(s):</strong> N/A</p>
        {/if}
        
        {#if movie.actors.length > 0}
          <p><strong>Cast:</strong> {movie.actors.join(', ')}</p>
        {:else}
          <p><strong>Cast:</strong> N/A</p>
        {/if}
        
        {#if movie.genres.length > 0}
          <p><strong>Genres:</strong> {movie.genres.join(', ')}</p>
        {:else}
          <p><strong>Genres:</strong> N/A</p>
        {/if}
        
        <div class="movie-description">
          <strong>Description:</strong>
          <p>{movie.description}</p>
        </div>
      </div>
    </div>
  {/each}

  <section class="bar-charts-section">
    <div class="chart-controls">
      <button on:click={() => {
          sharedStore.clickedAges = [];
          sharedStore.clickedYears = [];
          sharedStore.clickedScores = [];
      }} class="reset-button">Reset All Filters</button>
    </div>

    <div class="charts-container">
      <BarplotAge 
        width={width}
        height={height}
        usableArea={usableArea}
      />
        
      <BarplotYear 
        width={width}
        height={height}
        usableArea={usableArea}
      />
      
      <BarplotScore 
        width={width}
        height={height}
        usableArea={usableArea}
      />
    </div>

  </section>
</div>

<style>
/* GENERAL STYLES */
* {
  box-sizing: border-box;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  border-bottom: 2px solid #ddd;
  padding-bottom: 10px;
}

h2 {
  margin-top: 20px;
  margin-bottom: 15px;
  color: #444;
  display: flex;
  align-items: center;
}

h2::after {
  content: "";
  flex-grow: 1;
  height: 1px;
  background: #ccc;
  margin-left: 10px;
}

.dashboard {
  max-width: 1600px;
  margin: 0 auto;
}

/* SECTIONS */
section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 30px;
}

/* SVG STYLES */
svg {
  overflow: visible;
  background: white;
  border: 1px solid #eee;
  width: 100%;
  height: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border-radius: 4px;
}

/* SCATTER PLOT */
.scatter-plot-section .filters {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.filter-group {
  flex: 1;
  min-width: 200px;
}

.filter-input {
  width: 100%;
  padding: 8px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

circle {
  transition: 200ms;
  transform-origin: center;
  transform-box: fill-box;
}

circle:hover {
  transform: scale(1.2);
  fill: orange;
}

/* TOOLTIP STYLES */
.info.tooltip {
  display: grid;
  margin: 0;
  grid-template-columns: auto auto;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  border-radius: 5px;
  backdrop-filter: blur(5px);
  padding: 10px;
  position: fixed;
  top: 1em;
  left: 1em;
  z-index: 100;
  font-size: 14px;
}

.info.tooltip[hidden]:not(:hover, :focus-within) {
  opacity: 0;
  visibility: hidden;
}

.info dt {
  grid-column: 1;
  font-weight: bold;
  color: #666;
  margin-right: 10px;
}

.info dd {
  grid-column: 2;
  margin: 0;
  padding: 0;
}

/* BAR CHARTS */
.charts-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

/* CONTROLS */
.chart-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.reset-button {
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 15px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.reset-button:hover {
  background: #e0e0e0;
}

/* RESPONSIVE LAYOUTS */
@media (max-width: 900px) {
  .charts-container {
    flex-direction: column;
  }
}

/* Click Window */
.movie-popup {
  position: fixed; /* Mantemos fixed para o posicionamento absoluto */
  background: white; /* Fundo branco */
  border: 1px solid #ccc;
  padding: 1rem;
  width: 500px;
  max-height: 70vh;
  overflow-y: auto;
  z-index: 999;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  /* Removemos qualquer transparência ou transform */
}

/* Estilo do cabeçalho arrastável */
.drag-handle {
  cursor: grab;
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.drag-handle:active {
  cursor: grabbing;
}

/* Estilo do conteúdo */
.movie-details {
  padding: 0.5rem 0;
}

.movie-description {
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid #eee;
}

/* Botão de fechar */
.close-btn {
  position: absolute;
  right: 12px;
  top: 12px;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.movie-details {
  padding: 10px 0;
}

.movie-description {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.movie-description p {
  margin-top: 5px;
  color: #444;
}

</style>
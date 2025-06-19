const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('results-container');

searchForm.addEventListener('submit', handleSearch);

resultsContainer.addEventListener('click', handleResultClick);

async function handleSearch(event) {
    event.preventDefault();
    const query = searchInput.value.trim();

    if (!query) return;

    resultsContainer.innerHTML = '<p class="loading">Buscando...</p>';

    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime?q=${query}&sfw`);
        const data = await response.json();

        if (data.data.length === 0) {
            resultsContainer.innerHTML = `<p class="error">Nenhum resultado encontrado para "${query}".</p>`;
        } else {
            displaySearchResults(data.data);
        }
    } catch (error) {
        resultsContainer.innerHTML = '<p class="error">Ocorreu um erro na busca. Tente novamente.</p>';
        console.error('Erro na busca:', error);
    }
}

function displaySearchResults(animes) {
    resultsContainer.innerHTML = `
        <h2>Resultados da Busca</h2>
        <div class="search-results-grid">
            ${animes.map(anime => `
                <div class="result-card" data-id="${anime.mal_id}">
                    <img src="${anime.images.jpg.large_image_url}" alt="${anime.title}">
                    <h3>${anime.title}</h3>
                </div>
            `).join('')}
        </div>
    `;
}

function handleResultClick(event) {
    const card = event.target.closest('.result-card');
    if (card) {
        const animeId = card.dataset.id;
        fetchAndDisplayAnimeDetails(animeId);
    }
}

async function fetchAndDisplayAnimeDetails(id) {
    resultsContainer.innerHTML = '<p class="loading">Carregando detalhes...</p>';

    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);
        const data = await response.json();
        displayFullDetails(data.data);
    } catch (error) {
        resultsContainer.innerHTML = '<p class="error">Não foi possível carregar os detalhes do anime.</p>';
        console.error('Erro ao buscar detalhes:', error);
    }
}

function displayFullDetails(anime) {
    const formatList = (list) => list.map(item => item.name).join(', ') || 'N/A';

    resultsContainer.innerHTML = `
        <div class="anime-details-container">
            <div class="details-left">
                <img src="${anime.images.jpg.large_image_url}" alt="Pôster de ${anime.title}">
            </div>
            <div class="details-right">
                <h2>${anime.title_english || anime.title}</h2>
                <p><em>${anime.title_japanese}</em></p>
                
                <div class="stats">
                    <div class="stat"><span>⭐ ${anime.score || 'N/A'}</span><span>Nota</span></div>
                    <div class="stat"><span>#${anime.rank || 'N/A'}</span><span>Rank</span></div>
                    <div class="stat"><span>❤️ ${anime.favorites.toLocaleString() || 'N/A'}</span><span>Favoritos</span></div>
                    <div class="stat"><span>👥 ${anime.members.toLocaleString() || 'N/A'}</span><span>Membros</span></div>
                </div>

                <div class="synopsis">
                    <h3>Sinopse</h3>
                    <p>${anime.synopsis ? anime.synopsis.replace(/\n/g, '<br>') : 'Sinopse não disponível.'}</p>
                </div>

                <div class="info-grid">
                    <div class="info-item"><strong>Tipo:</strong> ${anime.type || 'N/A'}</div>
                    <div class="info-item"><strong>Episódios:</strong> ${anime.episodes || 'N/A'}</div>
                    <div class="info-item"><strong>Status:</strong> ${anime.status || 'N/A'}</div>
                    <div class="info-item"><strong>Exibição:</strong> ${anime.aired.string || 'N/A'}</div>
                    <div class="info-item"><strong>Estreia:</strong> ${anime.season ? `${anime.season} ${anime.year}` : 'N/A'}</div>
                    <div class="info-item"><strong>Estúdios:</strong> ${formatList(anime.studios)}</div>
                    <div class="info-item"><strong>Fonte:</strong> ${anime.source || 'N/A'}</div>
                    <div class="info-item"><strong>Gêneros:</strong> ${formatList(anime.genres)}</div>
                    <div class="info-item"><strong>Temas:</strong> ${formatList(anime.themes)}</div>
                    <div class="info-item"><strong>Classificação:</strong> ${anime.rating || 'N/A'}</div>
                </div>

                ${anime.trailer.embed_url ? `
                <div class="trailer-container">
                    <h3>Trailer</h3>
                    <iframe src="${anime.trailer.embed_url}" allowfullscreen></iframe>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}
const randomButton = document.getElementById('random-button');
const contentContainer = document.getElementById('anime-details-content');

randomButton.addEventListener('click', fetchAndDisplayRandomAnime);

document.addEventListener('DOMContentLoaded', fetchAndDisplayRandomAnime);


async function fetchAndDisplayRandomAnime() {
    contentContainer.innerHTML = '<p class="loading">Roletando um anime para você...</p>';

    try {
        const response = await fetch('https://api.jikan.moe/v4/random/anime');
        if (!response.ok) { 
             throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        displayFullDetails(data.data);

    } catch (error) {
        contentContainer.innerHTML = '<p class="error">Ops! Ocorreu um erro ao buscar um anime. Tente novamente.</p>';
        console.error('Erro ao buscar anime aleatório:', error);
    }
}

function displayFullDetails(anime) {
    const formatList = (list) => list.map(item => item.name).join(', ') || 'N/A';

    contentContainer.innerHTML = `
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
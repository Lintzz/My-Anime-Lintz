document.addEventListener('DOMContentLoaded', () => {
    buscarAnimesDaTemporada();
    buscarTopAnimes();
});

async function buscarAnimesDaTemporada() {
    const url = 'https://api.jikan.moe/v4/seasons/now?limit=15&sfw';
    const container = document.getElementById('secao-temporada');
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        container.innerHTML = ''; 

        data.data.forEach(anime => {
            const card = document.createElement('div');
            card.className = 'anime-card';
            card.innerHTML = `
                <img src="${anime.images.jpg.image_url}" alt="Pôster de ${anime.title}">
                <h3>${anime.title}</h3>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        container.innerHTML = '<p>Não foi possível carregar os animes. Tente novamente mais tarde.</p>';
    }
}

async function buscarTopAnimes() {
    const url = 'https://api.jikan.moe/v4/top/anime?limit=15';
    const container = document.getElementById('secao-top-avaliados');

    try {
        const response = await fetch(url);
        const data = await response.json();

        container.innerHTML = '';

        data.data.forEach(anime => {
            const card = document.createElement('div');
            card.className = 'anime-card';
            card.innerHTML = `
                <img src="${anime.images.jpg.image_url}" alt="Pôster de ${anime.title}">
                <h3>${anime.title}</h3>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        container.innerHTML = '<p>Não foi possível carregar os animes. Tente novamente mais tarde.</p>';
    }
}
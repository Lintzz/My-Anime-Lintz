function ajustarBrilhoCor(hex, percent) {
    let cor = hex.startsWith('#') ? hex.slice(1) : hex;

    if (cor.length === 3) {
        cor = cor.split('').map(c => c + c).join('');
    }

    let r = parseInt(cor.substring(0, 2), 16);
    let g = parseInt(cor.substring(2, 4), 16);
    let b = parseInt(cor.substring(4, 6), 16);

    const ajuste = Math.floor(255 * (percent / 100));

    r = Math.max(0, Math.min(255, r + ajuste));
    g = Math.max(0, Math.min(255, g + ajuste));
    b = Math.max(0, Math.min(255, b + ajuste));

    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
}

function applySavedSettings() {
    const savedTheme = localStorage.getItem('app_theme');
    const savedColor = localStorage.getItem('app_accent_color');
    const savedView = localStorage.getItem('app_list_view');

    const showScore = JSON.parse(localStorage.getItem('show_score')) ?? true;
    const showProgressBar = JSON.parse(localStorage.getItem('show_progress_bar')) ?? true;

    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
    } else {
        document.body.classList.add('dark-theme');
    }

    if (savedColor) {
        document.documentElement.style.setProperty('--cor-principal', savedColor);
        const hoverColor = ajustarBrilhoCor(savedColor, -10);
        document.documentElement.style.setProperty('--cor-principal-hover', hoverColor);
    } else {
        document.documentElement.style.removeProperty('--cor-principal');
        document.documentElement.style.removeProperty('--cor-principal-hover');
    }

    const listElement = document.getElementById('minha-lista');
    if (listElement) {
        listElement.classList.remove('view-grid', 'view-list');
        if (savedView === 'list') {
            listElement.classList.add('view-list');
        } else {
            listElement.classList.add('view-grid');
        }
    }

    if (showScore) {
        document.body.classList.remove('hide-score');
    } else {
        document.body.classList.add('hide-score');
    }

    if (showProgressBar) {
        document.body.classList.remove('hide-progress-bar');
    } else {
        document.body.classList.add('hide-progress-bar');
    }
}

applySavedSettings();
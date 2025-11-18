// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

const carouselTrack = document.getElementById('carouselTrack');
const carouselPrev = document.getElementById('carouselPrev');
const carouselNext = document.getElementById('carouselNext');
const carouselIndicators = document.getElementById('carouselIndicators');

if (carouselTrack) {
    const slides = Array.from(carouselTrack.children);
    let currentIndex = 0;

    // Create indicators
    slides.forEach((_, index) => {
        const indicator = document.createElement('button');
        indicator.className = 'carousel-indicator';
        if (index === 0) indicator.classList.add('active');
        indicator.addEventListener('click', () => goToSlide(index));
        carouselIndicators.appendChild(indicator);
    });

    const indicators = Array.from(carouselIndicators.children);

    function updateCarousel() {
        const slideWidth = slides[0].getBoundingClientRect().width;
        carouselTrack.style.transform = `translateX(-${currentIndex * slideWidth}px)`;
        
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentIndex);
        });
    }

    function goToSlide(index) {
        currentIndex = index;
        updateCarousel();
    }

    carouselNext.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % slides.length;
        updateCarousel();
    });

    carouselPrev.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        updateCarousel();
    });

    // Auto-play carousel
    setInterval(() => {
        currentIndex = (currentIndex + 1) % slides.length;
        updateCarousel();
    }, 5000);

    // Update on window resize
    window.addEventListener('resize', updateCarousel);
}

// Community Mods Data
const mods = [
    {
        name: "League Champs Pack",
        author: "0adri3n",
        description: "All 167 champions from League of Legends",
        icon: "🦸",
        filename: "lol-pack.zip"
    },
    {
        name: "Movies Pack",
        author: "0adri3n",
        description: "91 movies (twitter lovely made)",
        icon: "🎬",
        filename: "movies-pack.zip"
    } 
];

// Populate mods on community page
if (window.location.pathname.includes('community.html')) {
    const modsGrid = document.getElementById('modsGrid');
    const modsEmpty = document.getElementById('modsEmpty');

    if (mods.length > 0) {
        modsEmpty.style.display = 'none';
        
        mods.forEach(mod => {
            const modCard = document.createElement('div');
            modCard.className = 'mod-card';
            modCard.innerHTML = `
                <div class="mod-preview">${mod.icon}</div>
                <div class="mod-info">
                    <h3>${mod.name}</h3>
                    <div class="mod-meta">
                        <span>By ${mod.author}</span>
                    </div>
                    <p class="mod-description">${mod.description}</p>
                    <a href="mods/${mod.filename}" class="btn btn-primary mod-download" download>
                        Download Mod
                    </a>
                </div>
            `;
            modsGrid.appendChild(modCard);
        });
    } else {
        modsEmpty.style.display = 'block';
    }
}

(function () {
    'use strict';

    const IMAGES_PATH = './images/';
    const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif'];

    const galleryGrid = document.getElementById('galleryGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const imageCount = document.getElementById('imageCount');
    const modal = document.getElementById('modal');
    const modalImage = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    const modalClose = document.getElementById('modalClose');
    const prevBtn = document.getElementById('prevImage');
    const nextBtn = document.getElementById('nextImage');

    let images = [];
    let currentIndex = 0;

    async function fetchImageList() {
        try {
            const repoInfo = getRepoInfo();
            if (repoInfo) {
                const { owner, repo, path } = repoInfo;
                const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}images`;

                const response = await fetch(apiUrl, {
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                });

                if (response.ok) {
                    const data = await response.json();
                    const imageFiles = data
                        .filter(item => item.type === 'file')
                        .filter(item => {
                            const ext = '.' + item.name.split('.').pop().toLowerCase();
                            return IMAGE_EXTENSIONS.includes(ext);
                        });

                    if (imageFiles.length > 0) {
                        imageFiles.sort((a, b) => a.name.localeCompare(b.name));
                        images = imageFiles.map((file, index) => ({
                            name: file.name,
                            url: file.download_url,
                            index: index
                        }));
                        renderGallery();
                        return;
                    }
                }
            }
            await fallbackLoadImages();
        } catch (error) {
            console.warn('Ошибка загрузки через API, пробуем fallback:', error);
            await fallbackLoadImages();
        }
    }

    function getRepoInfo() {
        const url = window.location.href;
        const match = url.match(/https?:\/\/([^.]+)\.github\.io\/([^\/]+)/);
        if (match) {
            return {
                owner: match[1],
                repo: match[2] || '',
                path: match[2] ? `${match[2]}/` : ''
            };
        }
        return null;
    }

    async function fallbackLoadImages() {
        const commonNames = ['image', 'photo', 'pic', 'img', 'gallery', 'pony', 'ponies', '1', '2', '3', '4', '5'];
        const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
        let loaded = [];

        for (const name of commonNames) {
            for (const ext of extensions) {
                const url = `${IMAGES_PATH}${name}${ext}`;
                try {
                    const response = await fetch(url, { method: 'HEAD' });
                    if (response.ok) {
                        loaded.push({ name: `${name}${ext}`, url: url, index: loaded.length });
                        break;
                    }
                } catch {}
            }
        }

        if (loaded.length > 0) {
            images = loaded;
            renderGallery();
        } else {
            showEmpty();
        }
    }

    function renderGallery() {
        loadingState.classList.add('hidden');
        emptyState.classList.add('hidden');

        if (images.length === 0) {
            showEmpty();
            return;
        }

        imageCount.textContent = `Картинок: ${images.length} `;

        const items = galleryGrid.querySelectorAll('.gallery-item');
        items.forEach(el => el.remove());

        images.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.dataset.index = index;

            const imgEl = document.createElement('img');
            imgEl.src = img.url;
            imgEl.alt = img.name;
            imgEl.loading = 'lazy';

            const overlay = document.createElement('div');
            overlay.className = 'item-overlay';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'item-name';
            nameSpan.textContent = img.name;

            overlay.appendChild(nameSpan);
            item.appendChild(imgEl);
            item.appendChild(overlay);

            item.addEventListener('click', () => openModal(index));
            galleryGrid.appendChild(item);
        });
    }

    function showEmpty() {
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        imageCount.textContent = 'Картинок: 0';
    }

    function openModal(index) {
        currentIndex = index;
        const img = images[currentIndex];
        if (!img) return;

        modalImage.src = img.url;
        modalCaption.textContent = `${img.name} (${currentIndex + 1}/${images.length})`;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    function navigateModal(direction) {
        const newIndex = (currentIndex + direction + images.length) % images.length;
        openModal(newIndex);
    }

    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft' && !modal.classList.contains('hidden')) navigateModal(-1);
        if (e.key === 'ArrowRight' && !modal.classList.contains('hidden')) navigateModal(1);
    });

    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateModal(-1); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateModal(1); });

    fetchImageList();
})();
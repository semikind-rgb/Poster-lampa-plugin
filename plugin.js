(function () {
    'use strict';

    function initSeasonsPosters() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'render' && e.data.movie.name) {
                setTimeout(() => {
                    renderSeasonPosters(e.data);
                }, 500);
            }
        });
    }

    function renderSeasonPosters(data) {
        let card = Lampa.Activity.active();
        if (!card || !card.render) return;

        let seasonsContainer = card.render.find('.full-start__seasons');
        if (!seasonsContainer.length) return;

        let tv_id = data.movie.id;
        let tmdb_url = 'https://themoviedb.org' + tv_id + '?api_key=' + (Lampa.Storage.get('tmdb_api_key') || '4ef0d73cb5a4d9571f3495f2e82500c2') + '&language=ru-RU';

        $.ajax({
            url: tmdb_url,
            success: function (response) {
                if (!response.seasons || !response.seasons.length) return;

                let html = $('<div class="seasons-posters-grid"></div>');
                
                response.seasons.forEach(season => {
                    if (season.season_number === 0 && !season.poster_path) return; // Пропуск спецвыпусков без постера
                    
                    let poster = season.poster_path 
                        ? 'https://tmdb.org' + season.poster_path 
                        : 'https://placeholder.com';

                    let item = $(`
                        <div class="season-poster-item" data-season="${season.season_number}">
                            <div class="season-poster-img" style="background-image: url(${poster})"></div>
                            <div class="season-poster-title">${season.name}</div>
                            <div class="season-poster-count">${season.episode_count} сер.</div>
                        </div>
                    `);

                    item.on('hover:focus', function () {
                        // Фокус для пульта телевизора
                    }).on('hover:enter', function () {
                        openSeasonEpisodes(tv_id, season.season_number, season.name);
                    });

                    html.append(item);
                });

                // Стилизуем сетку постеров
                html.css({
                    'display': 'flex',
                    'flex-wrap': 'wrap',
                    'gap': '15px',
                    'padding': '10px 0'
                });

                seasonsContainer.html(html);
            }
        });
    }

    function openSeasonEpisodes(tv_id, season_number, season_name) {
        Lampa.Noty.show('Открытие: ' + season_name);
        // Логика вызова списка серий выбранного сезона Lampa
    }

    if (window.Lampa) {
        initSeasonsPosters();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initSeasonsPosters();
        });
    }
})();

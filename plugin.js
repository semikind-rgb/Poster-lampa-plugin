(function () {
    'use strict';

    function initSeasonsPosters() {
        // Подписываемся на триггер полной готовности карточки фильма/сериала
        Lampa.Listener.follow('full', function (e) {
            // Строго проверяем, что это событие старта отображения и данные корректны
            if (e.type === 'start' && e.data && e.data.movie) {
                // Запускаем асинхронный таймер, чтобы дать Lampa завершить постройку каталогов
                setTimeout(function () {
                    try {
                        executePostersTransform(e.data);
                    } catch (err) {
                        console.log('Seasons Posters Error: ', err);
                    }
                }, 400);
            }
        });
    }

    function executePostersTransform(data) {
        // Проверяем, что открытый контент — это сериал с сезонами
        if (!data.movie.number_of_seasons) return;

        // Находим активный слой карточки, избегая глобального поиска по всему приложению
        var activeActivity = Lampa.Activity.active();
        if (!activeActivity || !activeActivity.render) return;

        var render = activeActivity.render;
        
        // Ищем контейнер сезонов. Если его нет, плагин мгновенно прекращает работу
        var seasonsContainer = render.find('.full-start__seasons, .full-descr__seasons, [data-id="seasons"]');
        if (!seasonsContainer.length) return;

        var tv_id = data.movie.id;
        var network = new Lampa.Reguest();
        var tmdbUrl = 'tv/' + tv_id + '?language=ru-RU';

        // Запрашиваем структуру сезонов через внутреннюю прокси-сеть Lampa
        network.silent(tmdbUrl, function (response) {
            if (!response || !response.seasons || !response.seasons.length) return;

            // Очищаем штатный горизонтальный текстовый список
            seasonsContainer.empty();

            // Создаем изолированную ленту постеров
            var gridHtml = $('<div class="seasons-posters-grid"></div>');
            gridHtml.css({
                'display': 'flex',
                'flex-direction': 'row',
                'overflow-x': 'auto',
                'gap': '14px',
                'padding': '15px 5px',
                'width': '100%',
                'scroll-behavior': 'smooth',
                'box-sizing': 'border-box'
            });

            response.seasons.forEach(function (season) {
                if (season.season_number === 0 && !season.poster_path) return;

                // Парсим изображение через глобальный хелпер TMDB
                var poster = season.poster_path 
                    ? Lampa.TMDB.image('t/p/w300' + season.poster_path) 
                    : 'img/plugins/no-poster.png';

                // Рендерим HTML карточки сезона. Обязателен класс 'selector' для работы пульта!
                var item = $(`
                    <div class="season-poster-item selector" data-season="${season.season_number}" style="width: 130px; flex-shrink: 0; cursor: pointer; text-align: center;">
                        <div class="season-poster-img" style="background-image: url(${poster}); width: 100%; height: 195px; background-size: cover; background-position: center; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.6); transition: transform 0.2s ease;"></div>
                        <div class="season-poster-title" style="margin-top: 6px; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff;">${season.name}</div>
                        <div class="season-poster-count" style="font-size: 11px; color: #aeaeae; margin-top: 1px;">${season.episode_count} сер.</div>
                    </div>
                `);

                // Привязываем клик пульта (кнопка OK) к выбору сезона в контексте активности
                item.on('hover:enter', function () {
                    if (activeActivity.selectSeason) {
                        activeActivity.selectSeason(season.season_number);
                    } else if (activeActivity.object && activeActivity.object.selectSeason) {
                        activeActivity.object.selectSeason(season.season_number);
                    } else {
                        var nativeTab = render.find('.full-start__season[data-number="' + season.season_number + '"]');
                        if (nativeTab.length) nativeTab.trigger('click');
                    }
                });

                gridHtml.append(item);
            });

            seasonsContainer.append(gridHtml);

            // Мягко обновляем навигационную сетку пульта ТВ без перезагрузки интерфейса
            if (window.Lampa.Navigator) {
                Lampa.Navigator.update();
            }

        }, function () {
            console.log('Seasons Posters: Ошибка загрузки TMDB API');
        });
    }

    // Регистрация плагина при полной загрузке ядра Lampa
    if (window.Lampa) {
        initSeasonsPosters();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initSeasonsPosters();
        });
    }
})();

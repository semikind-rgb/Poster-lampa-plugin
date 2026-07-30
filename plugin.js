(function () {
    'use strict';

    function initSeasonsPosters() {
        // Подписываемся на открытие полной карточки релиза
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' && e.data.movie && e.data.movie.number_of_seasons) {
                // Дожидаемся рендеринга DOM-структуры карточки
                setTimeout(function () {
                    modifySeasonsToPosters(e.data);
                }, 300);
            }
        });
    }

    function modifySeasonsToPosters(data) {
        // Ищем контейнер сезонов внутри активной разметки карточки Lampa
        var activeRender = data.object.render();
        if (!activeRender) return;

        var seasonsContainer = activeRender.find('.full-start__seasons, .full-descr__seasons');
        if (!seasonsContainer.length) return;

        var tv_id = data.movie.id;
        
        // Используем встроенный сетевой класс Lampa (Reguest) для автоматического проксирования TMDB
        var network = new Lampa.Reguest();
        var tmdbUrl = 'tv/' + tv_id + '?language=ru-RU';

        network.silent(tmdbUrl, function (response) {
            if (!response || !response.seasons || !response.seasons.length) return;

            // Очищаем стандартный текстовый список селектора сезонов
            seasonsContainer.empty();

            // Создаем обертку для сетки постеров
            var gridHtml = $('<div class="seasons-posters-grid"></div>');
            
            // Задаем стили отображения сетки (flex-ряд с горизонтальной прокруткой для пультов)
            gridHtml.css({
                'display': 'flex',
                'flex-direction': 'row',
                'overflow-x': 'auto',
                'gap': '15px',
                'padding': '15px 5px',
                'width': '100%',
                'scroll-behavior': 'smooth'
            });

            response.seasons.forEach(function (season) {
                if (season.season_number === 0 && !season.poster_path) return; 

                // Получаем ссылку на постер через внутренний метод Lampa для картинок
                var poster = season.poster_path 
                    ? Lampa.TMDB.image('t/p/w300' + season.poster_path) 
                    : 'img/plugins/no-poster.png';

                var item = $(`
                    <div class="season-poster-item selector" data-season="${season.season_number}" style="width: 150px; flex-shrink: 0; cursor: pointer; transition: transform 0.2s ease;">
                        <div class="season-poster-img" style="background-image: url(${poster}); width: 100%; height: 220px; background-size: cover; background-position: center; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.4);"></div>
                        <div class="season-poster-title" style="margin-top: 8px; font-size: 14px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;">${season.name}</div>
                        <div class="season-poster-count" style="font-size: 12px; color: #a0a0a0; text-align: center;">${season.episode_count} эп.</div>
                    </div>
                `);

                // Добавляем обработчик клика/выбора сезона (для интеграции с плеером)
                item.on('hover:enter', function () {
                    // Эмулируем клик по оригинальной вкладке сезонов Lampa для открытия списка серий
                    if (data.object.selectSeason) {
                        data.object.selectSeason(season.season_number);
                    } else {
                        Lampa.Noty.show('Сезон ' + season.season_number + ' выбран');
                    }
                });

                gridHtml.append(item);
            });

            seasonsContainer.append(gridHtml);
            
            // Принудительно обновляем навигацию пульта, чтобы новые элементы стали кликабельными
            if (window.Lampa.Navigator) {
                Lampa.Navigator.update();
            }

        }, function () {
            Lampa.Noty.show('Ошибка загрузки данных сезонов из TMDB');
        });
    }

    // Регистрация плагина в системе Lampa
    if (window.Lampa) {
        initSeasonsPosters();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initSeasonsPosters();
        });
    }
})();

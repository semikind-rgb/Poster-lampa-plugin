(function () {
    'use strict';

    function initSeasonsPosters() {
        // Подключаемся к глобальному хуку отрисовки компонентов Lampa
        Lampa.Component.listener.follow('create', function (e) {
            // Проверяем, что создается именно компонент полного описания фильма/сериала
            if (e.name === 'full' && e.object) {
                
                // Перехватываем момент, когда Lampa сообщает, что карточка полностью готова (активна)
                var originalOnReady = e.object.onReady;
                e.object.onReady = function (data) {
                    if (originalOnReady) originalOnReady.apply(this, arguments);
                    
                    // Вызываем модификацию интерфейса, передавая данные страницы
                    try {
                        buildPostersGrid(e.object, data);
                    } catch (err) {
                        console.log('Seasons Posters Error: ', err);
                    }
                };
            }
        });
    }

    function buildPostersGrid(component, data) {
        // Проверяем, что открыт сериал, и у него есть сезоны в базе данных
        if (!data || !data.movie || !data.movie.number_of_seasons) return;

        var render = component.render();
        if (!render) return;

        // Ищем блок сезонов во всех возможных вариациях версий Lampa
        var seasonsContainer = render.find('.full-start__seasons, .full-descr__seasons, [data-id="seasons"]');
        if (!seasonsContainer.length) return;

        var tv_id = data.movie.id;
        var network = new Lampa.Reguest();
        // Используем системный запрос Lampa для автоматического обхода блокировок TMDB
        var tmdbUrl = 'tv/' + tv_id + '?language=ru-RU';

        network.silent(tmdbUrl, function (response) {
            if (!response || !response.seasons || !response.seasons.length) return;

            // Полностью вычищаем стандартный текстовый список серий/сезонов
            seasonsContainer.empty();

            // Создаем горизонтальную ленту-сетку для удобной навигации пультом TV
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
                // Пропускаем "Спецвыпуски" (0 сезон), если для них нет отдельного плаката
                if (season.season_number === 0 && !season.poster_path) return;

                // Получаем валидный URL картинки через встроенный прокси-конвертер изображений Lampa
                var poster = season.poster_path 
                    ? Lampa.TMDB.image('t/p/w300' + season.poster_path) 
                    : 'img/plugins/no-poster.png';

                // Создаем карточку постера. Класс 'selector' критически важен — без него пульт ТВ проигнорирует элемент
                var item = $(`
                    <div class="season-poster-item selector" data-season="${season.season_number}" style="width: 135px; flex-shrink: 0; cursor: pointer; text-align: center; focusable: true;">
                        <div class="season-poster-img" style="background-image: url(${poster}); width: 100%; height: 200px; background-size: cover; background-position: center; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.6); transition: transform 0.2s ease;"></div>
                        <div class="season-poster-title" style="margin-top: 6px; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff;">${season.name}</div>
                        <div class="season-poster-count" style="font-size: 11px; color: #aeaeae; margin-top: 1px;">${season.episode_count} сер.</div>
                    </div>
                `);

                // Привязываем событие нажатия кнопки ОК на пульте к штатной логике выбора сезона
                item.on('hover:enter', function () {
                    if (component.selectSeason) {
                        component.selectSeason(season.season_number);
                    } else {
                        // Резервный клик по нативным скрытым вкладкам, если метод недоступен
                        var nativeTab = render.find('.full-start__season[data-number="' + season.season_number + '"]');
                        if (nativeTab.length) nativeTab.trigger('click');
                    }
                });

                gridHtml.append(item);
            });

            seasonsContainer.append(gridHtml);

            // Переинициализируем навигационный менеджер, чтобы фокус пульта корректно переходил на новые постеры
            if (window.Lampa.Navigator) {
                Lampa.Navigator.update();
            }

        }, function () {
            console.log('Seasons Posters Plugin: Ошибка запроса к TMDB');
        });
    }

    // Инициализация при полной готовности экосистемы Lampa
    if (window.Lampa) {
        initSeasonsPosters();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initSeasonsPosters();
        });
    }
})();

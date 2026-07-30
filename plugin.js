(function () {
    'use strict';

    function initSeasonsPosters() {
        // Перехватываем создание компонента полного описания фильма ('full')
        var originalFull = Lampa.Component.get('full');
        
        if (originalFull) {
            Lampa.Component.add('full', function (object) {
                // Вызываем оригинальный конструктор карточки, чтобы не сломать логику Lampa
                originalFull.apply(this, arguments);

                // Сохраняем ссылку на оригинальный метод создания DOM-структуры
                var originalCreate = this.create;

                this.create = function () {
                    // Запускаем штатное построение интерфейса карточки
                    originalCreate.apply(this, arguments);

                    // Проверяем, что это сериал и у него есть сезоны
                    if (object.movie && object.movie.number_of_seasons) {
                        var render = this.render();
                        if (!render) return;

                        // Ищем контейнер сезонов по всем возможным селекторам Lampa
                        var seasonsContainer = render.find('.full-start__seasons, .full-descr__seasons, [data-id="seasons"]');
                        if (!seasonsContainer.length) return;

                        var tv_id = object.movie.id;
                        var network = new Lampa.Reguest();
                        // Запрос через встроенный прокси Лампы для обхода блокировок TMDB
                        var tmdbUrl = 'tv/' + tv_id + '?language=ru-RU';

                        network.silent(tmdbUrl, function (response) {
                            if (!response || !response.seasons || !response.seasons.length) return;

                            // Полностью очищаем старый текстовый список/кнопки
                            seasonsContainer.empty();

                            // Формируем контейнер-сетку с горизонтальным скроллом для пультов TV
                            var gridHtml = $('<div class="seasons-posters-grid"></div>');
                            gridHtml.css({
                                'display': 'flex',
                                'flex-direction': 'row',
                                'overflow-x': 'auto',
                                'gap': '15px',
                                'padding': '15px 5px',
                                'width': '100%',
                                'scroll-behavior': 'smooth',
                                'box-sizing': 'border-box'
                            });

                            response.seasons.forEach(function (season) {
                                // Игнорируем спецвыпуски (0 сезон), если у них нет картинки
                                if (season.season_number === 0 && !season.poster_path) return;

                                // Извлекаем ссылку на изображение через парсер TMDB в Lampa
                                var poster = season.poster_path 
                                    ? Lampa.TMDB.image('t/p/w300' + season.poster_path) 
                                    : 'img/plugins/no-poster.png';

                                // Шаблон карточки. Класс 'selector' обязателен для навигации кнопками пульта!
                                var item = $(`
                                    <div class="season-poster-item selector" data-season="${season.season_number}" style="width: 140px; flex-shrink: 0; cursor: pointer; text-align: center;">
                                        <div class="season-poster-img" style="background-image: url(${poster}); width: 100%; height: 210px; background-size: cover; background-position: center; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); transition: transform 0.2s ease;"></div>
                                        <div class="season-poster-title" style="margin-top: 8px; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff;">${season.name}</div>
                                        <div class="season-poster-count" style="font-size: 11px; color: #ababab; margin-top: 2px;">${season.episode_count} сер.</div>
                                    </div>
                                `);

                                // Обработка навигации и выбора (нажатия OK на пульте)
                                item.on('hover:enter', function () {
                                    if (object.selectSeason) {
                                        // Если метод активен в объекте, запускаем выбор сезона
                                        object.selectSeason(season.season_number);
                                    } else {
                                        // Альтернативный клик по скрытым триггерам Лампы
                                        var nativeTab = render.find('.full-start__season[data-number="' + season.season_number + '"]');
                                        if (nativeTab.length) nativeTab.trigger('click');
                                    }
                                });

                                gridHtml.append(item);
                            });

                            seasonsContainer.append(gridHtml);

                            // Перезапускаем навигационный модуль Lampa, чтобы пульт увидел новые элементы
                            if (window.Lampa.Navigator) {
                                Lampa.Navigator.update();
                            }

                        }, function () {
                            console.log('Seasons Posters Plugin: Ошибка сети/TMDB API');
                        });
                    }
                };
            });
        }
    }

    // Регистрация при готовности ядра приложения
    if (window.Lampa) {
        initSeasonsPosters();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initSeasonsPosters();
        });
    }
})();

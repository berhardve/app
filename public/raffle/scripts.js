$(document).ready(function() {
    // Cargar las rifas disponibles al cargar la página
    fetchRaffles();

    // Configurar eventos
    $(document).on('click', '.raffle-item', function() {
        var raffleId = $(this).data('raffle-id');
        $('#raffle-id').val(raffleId);
        $('#buy-raffle-form').slideDown();
    });

    $('#create-raffle-form').submit(function(event) {
        event.preventDefault();
        var numCount = parseInt($('#numbers').val());
        var maxAmountPerNumber = $('#max-amount-per-number').val();

        $.ajax({
            url: '/raffles',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ numbers: numCount, maxAmountPerNumber: maxAmountPerNumber }),
            success: function(data) {
                console.log('Rifa creada:', data);
                location.reload();
            },
            error: function(err) {
                console.error('Error al crear la rifa:', err);
                if (err.responseJSON && err.responseJSON.error) {
                    console.error('Mensaje de error del servidor:', err.responseJSON.error);
                }
            }
        });
    });

    $('#buy-raffle-form').submit(function(event) {
        event.preventDefault();
        var raffleId = $('#raffle-id').val();
        var number = $('#raffle-number').val();
        var amountToBuy = $('#amount-to-buy').val();
        var buyerName = $('#buyerName').val();

        $.ajax({
            url: '/raffles/' + raffleId + '/buy',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ buyerName: buyerName, number: number, amountToBuy: amountToBuy }),
            success: function(data) {
                console.log('Número de rifa comprado:', data);
                $('#remaining-amount').val(data.remainingAmount - amountToBuy);
                $('#error-message').text('');
            },
            error: function(err) {
                console.error('Error al comprar el número de rifa:', err);
                if (err.responseJSON && err.responseJSON.error) {
                    $('#error-message').text(err.responseJSON.error);
                }
            }
        });
    });

    // Función para registrar un ganador
    $('#register-winner-form').submit(function(event) {
        event.preventDefault();
        var raffleId = $('#raffle-select-winner').val();
        var winningNumber = $('#winning-number').val();

        $.ajax({
            url: '/raffles/' + raffleId + '/winners',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ number: winningNumber }),
            success: function(data) {
                console.log('Ganador registrado:', data);
                // Aquí podrías actualizar la interfaz si es necesario, como mostrar un mensaje de éxito.
            },
            error: function(err) {
                console.error('Error al registrar ganador:', err);
                if (err.responseJSON && err.responseJSON.error) {
                    console.error('Mensaje de error del servidor:', err.responseJSON.error);
                }
            }
        });
    });

   // Función para mostrar el listado de ganadores
    $('#show-winners-btn').click(function() {
        var raffleId = $('#raffle-select-winner').val();

        $.ajax({
            url: '/raffles/' + raffleId + '/winners',
            method: 'GET',
            success: function(data) {
                console.log('Listado de ganadores:', data);

                // Limpiamos la lista actual de ganadores
                $('#winners-list').empty();

                // Mostramos los ganadores en la lista
                data.forEach(function(winner) {
                    var listItem = `<li class="list-group-item"> Rifa: ${winner.raffleId}<br/> Numero Ganador: ${winner.number}  <br/> Nombre: ${winner.buyerName} <br/> Monto comprado: ${winner.amountBought}  </li>`;
                    $('#winners-list').append(listItem);
                });
            },
            error: function(err) {
                console.error('Error al obtener listado de ganadores:', err);
                $('#winners-list').empty().append('<li class="list-group-item">Error al cargar ganadores</li>');
            }
        });
    });

    // Función para cargar las rifas desde el servidor
    function fetchRaffles() {
        fetch('/raffle/raffles')
          .then(response => response.json())
          .then(raffles => {
            const raffleSelect = document.getElementById('raffle-id');
            const raffleSelectWinner = document.getElementById('raffle-select-winner');

            raffleSelect.innerHTML = '';
            raffleSelectWinner.innerHTML = '';

            raffles.forEach(raffle => {
              const option = document.createElement('option');
              option.value = raffle.id;
              option.textContent = `Rifa ${raffle.id}`;
              raffleSelect.appendChild(option);

              const optionWinner = document.createElement('option');
              optionWinner.value = raffle.id;
              optionWinner.textContent = `Rifa ${raffle.id}`;
              raffleSelectWinner.appendChild(optionWinner);
            });
          })
          .catch(error => {
            console.error('Error al obtener rifas:', error);
          });
    }

    // Agregar evento para cambio de valor en el campo #raffle-number
    $('#raffle-number').change(function() {
        var raffleId = $('#raffle-id').val();
        var number = $(this).val();

        if (raffleId && number) {
            $.ajax({
                url: '/raffles/' + raffleId + '/number/' + number + '/remaining',
                method: 'GET',
                success: function(data) {
                    $('#remaining-amount').val(data.remainingAmount);
                    $('#error-message').text('');
                },
                error: function(err) {
                    console.error('Error al obtener la cantidad restante:', err);
                    $('#remaining-amount').val('');
                    if (err.responseJSON && err.responseJSON.error) {
                        $('#error-message').text(err.responseJSON.error);
                    }
                }
            });
        }
    });
});

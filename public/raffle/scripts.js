$(document).ready(function() {
    // Cargar las rifas disponibles al cargar la página
    $.ajax({
        url: '/raffles',
        method: 'GET',
        dataType: 'json',
        success: function(data) {
            $('#raffles-list').empty();
            data.forEach(function(raffle) {
                var raffleId = raffle.id;
                var raffleNumbers = raffle.numbers.map(function(number) {
                    return number.number;
                }).join(', ');

                var raffleItem = $('<li>')
                    .addClass('list-group-item raffle-item')
                    .attr('data-raffle-id', raffleId)
                    .html('<h5 class="raffle-title">Rifa ' + raffleId + '</h5><div class="numbers-list">' + raffleNumbers + '</div>');

                $('#raffles-list').append(raffleItem);
            });

            $('#raffle-id').empty().append('<option value="">Seleccione la rifa...</option>');
            data.forEach(function(raffle) {
                $('#raffle-id').append('<option value="' + raffle.id + '">Rifa ' + raffle.id + '</option>');
            });
        },
        error: function(err) {
            console.error('Error al cargar las rifas:', err);
        }
    });

        $(document).on('click', '.raffle-item', function() {
            var raffleId = $(this).data('raffle-id');
            $('#raffle-id').val(raffleId);
            $('#buy-raffle-form').slideDown();
        });

        $('#create-raffle-form').submit(function(event) {
            event.preventDefault();
            
            var numCount = parseInt($('#numbers').val());
            var maxAmountPerNumber = $('#max-amount-per-number').val();
            
            console.log('Cantidad Numeros Rifa:', numCount);
            console.log('Monto Por Numero:', maxAmountPerNumber);

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

  $('#raffle-number').change(function() {
      $('#remaining-amount').val('');
      $('#error-message').text('');
  });
});
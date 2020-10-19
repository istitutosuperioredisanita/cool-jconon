define(['jquery', 'header', 'json!common', 'cnr/cnr.bulkinfo', 'cnr/cnr.search', 'cnr/cnr.url', 'i18n', 'cnr/cnr.ui', 'cnr/cnr.actionbutton', 'cnr/cnr.jconon', 'handlebars', 'cnr/cnr', 'moment', 'cnr/cnr.application', 'cnr/cnr.criteria', 'cnr/cnr.ace', 'cnr/cnr.call', 'cnr/cnr.node', 'json!cache',  'cnr/cnr.attachments'], function ($, header, common, BulkInfo, Search, URL, i18n, UI, ActionButton, jconon, Handlebars, CNR, moment, Application, Criteria, Ace, Call, Node, cache, Attachments) {
  "use strict";

  var search,
    rootTypeId = 'F:jconon_application:folder',
    typeId = 'F:jconon_call:folder',
    myType = 'jconon_application:folder',
    elements = {
      table: $('#items'),
      pagination: $('#itemsPagination'),
      orderBy: $('#orderBy'),
      label: $('#emptyResultset'),
      total: $('#total'),
      //icone per l'export dei dati
       exportPanel:  $('<div id="export-div" class="float-right mb-1 mr-1">' +
                            '<a id="export-xls" title="Esporta dati in Excel" class="btn btn-success" style="display:none">' +
                            ' <i class="icon-table"></i></a>' +
                            '</div>').appendTo($('#header-table'))
    },
    bulkInfo,
    criteria = $('#criteria'),
    callProperties,
    callId = URL.querystring.from['cmis:objectId'];


  function displayAttachments(nodeRef, type, displayFn, i18nModal) {
    var content = $('<div></div>').addClass('modal-inner-fix');
    jconon.findAllegati(nodeRef, content, type, true, displayFn, true);
    UI.modal(i18n[i18nModal || 'actions.attachments'], content, undefined, undefined, true);
  }

  function manageUrlParams() {
    if (callId) {
      URL.Data.node.node({
        data: {
          nodeRef : callId
        },
        success: function (data) {
          $('#header-table div h1').text('DOMANDE RELATIVE AL BANDO ' + data['jconon_call:codice'] + (data['jconon_call:sede'] ? ' - ' + data['jconon_call:sede']: ''));
          callProperties = data;
        },
        error: function (jqXHR, textStatus, errorThrown) {
          CNR.log(jqXHR, textStatus, errorThrown);
        }
      });
    }
    if (common.pageId == 'applications-user') {
      $('#header-table div h1').text('DOMANDE');
    }
  }

  manageUrlParams();

  // filter ajax resultSet according to the Criteria form
  function filterFn(data) {

    var filtered = $.grep(data.items, function (el) {
      var callCode = bulkInfo.getDataValueById('filters-codice'),
        callFromDate = bulkInfo.getDataValueById('filters-da_data'),
        callToDate = bulkInfo.getDataValueById('filters-a_data'),
        callStatus = callId ? 'tutti' : bulkInfo.getDataValueById('filters-attivi_scaduti'),
        call = el.relationships.parent ? el.relationships.parent[0] : {},
        now = new Date(common.now),
        isActive = call['jconon_call:data_fine_invio_domande_index'] === "" ||
          (new Date(call['jconon_call:data_inizio_invio_domande_index']) < now && new Date(call['jconon_call:data_fine_invio_domande_index']) > now);

      if (callCode) {
        if (!new RegExp(callCode, "gi").test(call['jconon_call:codice'])) {
          return false;
        }
      }

      if (callFromDate) {
        if (new Date(call['jconon_call:data_fine_invio_domande_index']) < new Date(callFromDate)) {
          return false;
        }
      }

      if (callToDate) {
        if (new Date(call['jconon_call:data_fine_invio_domande_index']) > new Date(callToDate)) {
          return false;
        }
      }

      if (callStatus) {
        if (callStatus === 'attivi' && !isActive) {
          return false;
        }
        if (callStatus === 'scaduti' && isActive) {
          return false;
        }
      }
      return true;
    });
    data.items = filtered;
    data.totalNumItems = filtered.length;
    data.hasMoreItems = filtered.length > data.maxItemsPerPage;

    return data;
  }

  function filter() {
    search.execute();
  }

  function allegaDocumentoAllaDomanda(type, objectId, successCallback) {
    Node.submission({
      nodeRef: objectId,
      objectType: type,
      crudStatus: "INSERT",
      requiresFile: true,
      showFile: true,
      externalData: [
        {
          name: 'aspect',
          value: 'P:jconon_attachment:generic_document'
        },
        {
          name: 'aspect',
          value: 'P:jconon_attachment:document_from_rdp'
        },
        {
          name: 'jconon_attachment:user',
          value: common.User.id
        }
      ],
      modalTitle: i18n[type],
      success: function (attachmentsData, data) {
        if (successCallback) {
          successCallback(attachmentsData, data);
        } else {
          $('#applyFilter').click();
        }
      },
      forbidArchives: true
    });
  }
  Handlebars.registerHelper('applicationStatus', function declare(code, dataInvioDomanda, dataUltimaModifica, dataScadenza) {
    var dateFormat = "DD/MM/YYYY HH:mm:ss",
      isTemp = (code === 'P' || code === 'I'),
      msg = i18n['label.application.stato.' + (code === 'I' ? 'P' : code)],
      item = $('<label class="label"></label>')
        .addClass(isTemp ? 'label-warning' : 'label-success')
        .addClass(dataScadenza !== "" && (moment().diff(dataScadenza, 'days') > -7) ? 'animated flash' : '')
        .append(msg)
        .append(isTemp ? (' - modificata il ' + CNR.Date.format(dataUltimaModifica, '-', dateFormat)) : (' il ' + CNR.Date.format(dataInvioDomanda, '-', dateFormat)));
    return $('<div>').append(item).html();
  });

  Handlebars.registerHelper('esclusioneRinuncia', function esclusioneRinunciaFn(esclusioneRinuncia, statoDomanda, dataDomanda, isRdP) {

    var m = {
      'E': 'Esclusa',
      'R': 'Ritirata',
      'S': 'Scheda anonima respinta',
      'A': 'Sospesa',
      'N': 'Non Ammesso'
    }, a;

    if (statoDomanda === 'C' && dataDomanda && m[esclusioneRinuncia]) {
      if ((esclusioneRinuncia === 'A' && (isRdP || Call.isConcorsi()))) {
        a = $('<span class="label label-warning animated flash"></span>').append(m[esclusioneRinuncia]);
      } else if ((esclusioneRinuncia === 'S' && isRdP) || (esclusioneRinuncia !== 'S' && esclusioneRinuncia !== 'A')) {
        a = $('<span class="label label-important animated flash"></span>').append(m[esclusioneRinuncia]);
      }
    }

    return $('<div>').append(a).html();
  });

  Handlebars.registerHelper('scadenza', function scadenza(date) {
    var isExpired = CNR.Date.isPast(new Date(date)),
      a = $('<span>' + i18n[isExpired ? "label.th.jconon_bando_data_scadenza_expired" : "label.th.jconon_bando_data_scadenza"] + '</span>')
        .append(' ')
        .addClass(isExpired ? 'text-error' : '')
        .append(CNR.Date.format(date, "-", "DD/MM/YYYY HH:mm:ss"));
    return $('<div>').append(a).html();
  });

  function estraixls(urlparams, type) {
    var close = UI.progress();
      jconon.Data.call.applications({
        type: 'GET',
        data:  {
            urlparams: urlparams,
            type: type,
            queryType: 'application',
            fileName: callProperties ? callProperties['jconon_call:codice']: 'domande'
        },
        success: function (data) {
            var url = URL.template(jconon.URL.call.downloadXLS, {
              objectId: data.objectId,
              fileName: data.fileName,
              exportData: true,
              mimeType: 'application/vnd.ms-excel;charset=UTF-8'
            });
            window.location = url;
        },
        complete: close,
        error: URL.errorFn
    });
  }

  function addProductAfterCommission(el, callData) {
      var applicationAttachments = $.extend([], Application.completeList(
        callData['jconon_call:elenco_prodotti'],
        cache.jsonlistApplicationAttachments
      )),
      content = $("<div></div>").addClass('modal-inner-fix').css('height','50vh'),
      bigModal,
      attachment = new Attachments({
        isSaved: true,
        selectGroupClass: 'w-100',
        affix: content,
        objectTypes: applicationAttachments,
        cmisObjectId: el.id,
        search: {
          type: 'cvpeople:selectedProduct',
          displayRow: Application.displayTitoli,
          displayAfter: function (documents, refreshFn, resultSet, isFilter) {
            if (!isFilter) {
              bigModal.find('#myModalLabel').html('<i class="icon-edit"></i> Prodotti Scelti ' + i18n.prop('label.righe.visualizzate', documents.totalNumItems));
            }
          },
          fetchCmisObject: true,
          calculateTotalNumItems: true,
          maxItems: 5,
          filter: false
        },
        submission: {
          externalData: [
            {
              name: 'aspect',
              value: 'P:jconon_attachment:generic_document'
            },
            {
              name: 'aspect',
              value: 'P:cvpeople:selectedProduct'
            },
            {
              name: 'jconon_attachment:user',
              value: el['jconon_attachment:user']
            }
          ]
        }
      });
      attachment();
      bigModal = UI.bigmodal('<i class="icon-edit"></i> Prodotti Scelti', content, function() {
         var close = UI.progress();
         jconon.Data.application.validate_attachments({
            type: 'POST',
            data: {
                'callId' : callData['cmis:objectId'],
                'applicationId': el.id
            },
            success: function (data) {
              bigModal.modal('hide');
              var close = UI.progress();
              jconon.Data.application.remove_contributor_product_after_commission({
                type: 'POST',
                data: {
                    'callId' : callData['cmis:objectId'],
                    'applicationId': el.id
                },
                success: function (data) {
                    UI.success(i18n['message.operation.performed']);
                    filter();
                },
                complete: close,
                error: URL.errorFn
              });
            },
            complete: close,
            error: URL.errorFn
         });
         return false;
      });
      bigModal.find('.submit').text(i18n['message.confirm']);
  }

  search = new Search({
    elements: elements,
    columns: ['cmis:parentId', 'jconon_application:stato_domanda', 'jconon_application:nome', 'jconon_application:cognome', 'jconon_application:data_domanda', 'jconon_application:codice_fiscale', 'jconon_application:data_nascita', 'jconon_application:esclusione_rinuncia', 'jconon_application:user'],
    fields: {
      'nome': null,
      'data di creazione': null,
      'Ultima Modifica': 'cmis:lastModificationDate',
      'Cognome': 'jconon_application:cognome',
      'Stato Domanda': 'jconon_application:stato_domanda',
      'Esclusione/Rinuncia':  'jconon_application:esclusione_rinuncia'
    },
    orderBy: [{
        field: 'cmis:lastModificationDate',
        asc: false
    }],
    type: myType,
    maxItems: callId || common.pageId == 'applications-user' ? undefined : 100,
    dataSource: function (page, settings, getUrlParams) {
      var deferred,
        baseCriteria = new Criteria().not(new Criteria().equals('jconon_application:stato_domanda', 'I').build()),
        criteria = new Criteria(),
        applicationStatus = bulkInfo.getDataValueById('filters-provvisorie_inviate'),
        user = bulkInfo.getDataValueById('user'),
        url;

      if (applicationStatus && applicationStatus !== 'tutte' && applicationStatus !== 'attive' && applicationStatus !== 'escluse') {
        baseCriteria.and(new Criteria().equals('jconon_application:stato_domanda', applicationStatus).build());
      }

      if (applicationStatus && applicationStatus === 'attive') {
        baseCriteria.and(new Criteria().equals('jconon_application:stato_domanda', 'C').build());
        baseCriteria.or(
            {type: '=', what: 'jconon_application:esclusione_rinuncia', to: 'A', valueType: 'string'},
            {type: 'NULL', what: 'jconon_application:esclusione_rinuncia'}
        );
      }

      if (applicationStatus && applicationStatus === 'escluse') {
        baseCriteria.and(new Criteria().equals('jconon_application:stato_domanda', 'C').build());
        if (callId && common.User.admin || Call.isRdP(callProperties['jconon_call:rdp']) || Call.isCommissario(callProperties['jconon_call:commissione'])) {
            baseCriteria.and(new Criteria().IN('jconon_application:esclusione_rinuncia', 'E,R,N,S', 'list').build());
        } else {
            baseCriteria.and(new Criteria().IN('jconon_application:esclusione_rinuncia', 'E,R,N', 'list').build());
        }
      }
      if (user) {
        criteria.and(new Criteria().equals('jconon_application:user', user).build());
      }
      if (callId) {
          if (cache['query.index.enable']) {
            criteria.inTree(callId);
          } else {
            criteria.inFolder(callId);
          }
      } else {
        if (common.pageId !== 'applications-user') {
          criteria.equals('jconon_application:user', common.User.id);
        } else {
          if (cache['query.index.enable']) {
            criteria.inTree(cache.competition.id);
          } else {
            criteria.inFolder(cache.competition.id);
          }
        }
      }
      settings.lastCriteria = criteria.and(baseCriteria.build()).build();

      $('#export-xls').off('click').on('click', function () {
        var allApplication = $('<button class="btn btn-success span4 h-100" data-dismiss="modal" title="Scarica un file excel delle domande"><i class="icon-download-alt"></i> Dati relativi alle domande</button>').
              off('click').on('click', function () {
                estraixls(getUrlParams(page).q, 'application');
            }),
            allPunteggi = $('<button class="btn btn-info span4 h-100" data-dismiss="modal" title="Scarica un file excel dei punteggi e della graduatoria"><i class="icon-download-alt"></i> Dati relativi ai punteggi e alle graduatoria</button>').
              off('click').on('click', function () {
                estraixls(getUrlParams(page).q, 'score');
            }),
            allApplicationIstruttoria = $('<button class="btn btn-warning span4 h-100" data-dismiss="modal" title="Scarica un file excel con tutti i dati delle domande"><i class="icon-download-alt"></i> Dati relativi alle domande per istruttoria</button>').
              off('click').on('click', function () {
                estraixls(getUrlParams(page).q, 'istruttoria');
            }),
          btnClose,
          modalField = $('<div class="row-fluid h-90px">'),
          m;
        modalField.append(allApplication).append(allPunteggi).append(allApplicationIstruttoria);
        m = UI.modal('<i class="icon-table text-success"></i> Estrazione excel relative alle domande filtrate', modalField);
        $('button', modalField).tooltip({
          placement: 'bottom',
          container: modalField
        });
      });

      deferred = URL.Data.search.query({
        cache: false,
        queue: true,
        data: $.extend({}, getUrlParams(page), {
          fetchCmisObject: true,
          relationship: 'parent'
        })
      });

      deferred.done(function (data) {
        if (elements.total) {
          elements.total.text(data.totalNumItems + ' elementi trovati in totale');
        }
      });

      if (!callId && common.pageId !== 'applications-user') {
        deferred = deferred.pipe(filterFn);
      }

      return deferred;
    },
    display: {
      resultSet: function (resultSet, target) {
        var xhr = new BulkInfo({
          target: $('<tbody>').appendTo(target),
          handlebarsId: 'application-main-results',
          path: typeId,
          metadata: resultSet,
          handlebarsSettings: {
            call_type: typeId === rootTypeId ? true : false,
            callId: callId || common.pageId == 'applications-user',
            isRdP: (Call.isRdP(resultSet[0].relationships.parent[0]['jconon_call:rdp']) || common.User.admin)
          }
        }).handlebars();

        xhr.done(function () {

          target
            .off('click', '.requirements')
            .on('click', '.requirements', function () {
              var data = $("<div></div>").addClass('modal-inner-fix').html($(this).data('content'));
              UI.modal('<i class="icon-info-sign text-info animated flash"></i> ' + i18n['label.th.jconon_bando_elenco_titoli_studio'], data);
            });
          target
            .off('click', '.user')
            .on('click', '.user', function (event) {
              var authority = $(event.target).attr('data-user');
              Ace.showMetadata(authority, common.User.admin || Call.isConcorsi());
            });

          var rows = target.find('tbody tr');
          $.each(resultSet, function (index, el) {
            var target = $(rows.get(index)).find('td:last'),
              callData = el.relationships.parent[0],
              callAllowableActions = callData.allowableActions,
              dropdowns = {},
              bandoInCorso = (callData['jconon_call:data_fine_invio_domande_index'] === "" ||
                new Date(callData['jconon_call:data_fine_invio_domande_index']) > new Date(common.now)),
              displayActionButton = true,
              defaultChoice,
              customButtons = {
                select: false,
                permissions: false,
                remove: false,
                copy: false,
                cut: false,
                print: function () {
                  Application.print(el.id, el['jconon_application:stato_domanda'], bandoInCorso, el['jconon_application:data_domanda']);
                }
              };

            if (i18n.prop('actions.duplicate', 'NOT_FOUND') !== 'NOT_FOUND') {
              customButtons.duplicate = function () {
                Call.pasteApplication(el.id, callData['cmis:objectTypeId'], callData['cmis:objectId'], callData['jconon_call:has_macro_call']);
              };
            }

            if (callData['jconon_call:elenco_sezioni_domanda'] && callData['jconon_call:elenco_sezioni_domanda'].indexOf('affix_tabTitoli') >= 0) {
              if (!bandoInCorso && (common.User.admin || Call.isConcorsi() || Call.isRdP(callData['jconon_call:rdp']))) {
                var applicationAttachments = Application.completeList(callData['jconon_call:elenco_association'],cache.jsonlistApplicationAttachments);
                applicationAttachments.push({'key':'D:jconon_attachment:integration', 'label':'Integrazioni alla Domanda'});
                customButtons.attachments = function () {                
                  var content = $("<div></div>").addClass('modal-inner-fix'),
                  bigModal,               
                  attachment = new Attachments({
                    isSaved: true,
                    selectGroupClass: 'span6 offset3',
                    affix: content,
                    objectTypes: applicationAttachments,
                    cmisObjectId: el.id,
                    search: {
                      type: 'jconon_attachment:generic_document',
                      displayRow: Application.displayTitoli,
                      displayAfter: function (documents, refreshFn, resultSet, isFilter) {
                        if (!isFilter) {
                          bigModal.find('#myModalLabel').html('<i class="icon-edit"></i> Allegati ' + i18n.prop('label.righe.visualizzate', documents.totalNumItems));
                        }
                      },
                      fetchCmisObject: true,
                      calculateTotalNumItems: true,
                      maxItems: 10,
                      filter: false
                    },
                    submission: {
                      externalData: [
                        {
                          name: 'aspect',
                          value: 'P:jconon_attachment:generic_document'
                        },
                        {
                          name: 'jconon_attachment:user',
                          value: el['jconon_attachment:user']
                        }
                      ]
                    }
                  });
                  attachment();
                  bigModal = UI.bigmodal('<i class="icon-edit"></i> Allegati', content);
                };  
              } else {
                customButtons.attachments = function () {
                  displayAttachments(el.id, 'jconon_attachment:generic_document', Application.displayTitoli);
                };
              }
            }
            if (callData['jconon_call:elenco_sezioni_domanda'] && callData['jconon_call:elenco_sezioni_domanda'].indexOf('affix_tabCurriculum') >= 0) {
              customButtons.curriculum = function () {
                //Curriculum
                displayAttachments(el.id, 'jconon_attachment:cv_element', Application.displayCurriculum, 'actions.curriculum');
              };
            }
            if (callData['jconon_call:elenco_sezioni_domanda'] && callData['jconon_call:elenco_sezioni_domanda'].indexOf('affix_tabSchedaAnonima') >= 0) {
              customButtons.schedaAnonima = function () {
                //Scheda Anonima
                displayAttachments(el.id, 'jconon_scheda_anonima:document', Application.displaySchedaAnonima, 'actions.schedaAnonima');
              };
            }
            if (callData['jconon_call:elenco_sezioni_domanda'] && callData['jconon_call:elenco_sezioni_domanda'].indexOf('affix_tabElencoProdotti') >= 0) {
              customButtons.productList = function () {
                //Elenco Prodotti
                displayAttachments(el.id, 'cvpeople:noSelectedProduct', Application.displayProdotti, 'actions.productList');
              };
            }
            if (callData['jconon_call:elenco_sezioni_domanda'] && callData['jconon_call:elenco_sezioni_domanda'].indexOf('affix_tabProdottiScelti') >= 0) {
              if (callData['cmis:secondaryObjectTypeIds'].indexOf('P:jconon_call:selected_products_after_commission') !== -1) {
                  if (!bandoInCorso &&
                    new Date(callData['jconon_call:selected_products_start_date']) < new Date(common.now) &&
                    new Date(callData['jconon_call:selected_products_end_date']) > new Date(common.now) &&
                    (common.User.admin || Call.isConcorsi() || common.User.id === el['jconon_application:user'])) {
                    customButtons.productSelected = function () {
                      if (el.allowableActions.indexOf('CAN_CREATE_DOCUMENT') != -1) {
                        addProductAfterCommission(el, callData);
                      } else {
                        var confirmModal = UI.modal(null, '<i class="icon-question-sign icon-4x text-info"></i> <h5>Si desidera avviare il processo di caricamento/modifica dei prodotti scelti?</h5>', function () {
                            var close = UI.progress();
                            jconon.Data.application.add_contributor_product_after_commission({
                              type: 'POST',
                              data: {
                                  'callId' : callData['cmis:objectId'],
                                  'applicationId': el.id
                              },
                              success: function (data) {
                                addProductAfterCommission(el, callData);
                                filter();
                              },
                              complete: close,
                              error: URL.errorFn
                            });
                        });
                        confirmModal.find('.modal-footer').append($('<button class="btn btn-success" data-dismiss="modal"> Visualizza</button>')
                        .off('click').on('click', function () {
                          displayAttachments(el.id, 'cvpeople:selectedProduct', Application.displayTitoli, 'actions.productSelected');
                        }));
                      }
                    };
                  } else {
                      //Prodotti Scelti
                      customButtons.productSelected = function () {
                        displayAttachments(el.id, 'cvpeople:selectedProduct', Application.displayTitoli, 'actions.productSelected');
                      };
                  }
              } else {
                  //Prodotti Scelti
                  customButtons.productSelected = function () {
                    displayAttachments(el.id, 'cvpeople:selectedProduct', Application.displayProdottiScelti, 'actions.productSelected');
                  };
              }
            }
            //  Modifica
            customButtons.edit = function () {
              window.location = jconon.URL.application.manage + '?callId=' + callData['cmis:objectId'] + '&applicationId=' + el['cmis:objectId'];
            };
            if (el['jconon_application:stato_domanda'] === 'P') {
              // provvisoria
              if (bandoInCorso) {
                if (common.User.admin || common.User.id === el['jconon_application:user']) {
                  defaultChoice = 'edit';
                } else {
                  customButtons.edit = false;
                  defaultChoice = 'print';
                }
              } else {
                //  label Scaduto
                $.each(customButtons, function (index, el) {
                  if (index !== "print" && index !== "duplicate") {
                    customButtons[index] = false;
                  }
                });
                customButtons.edit = false;
                displayActionButton = true;
              }
            } else if (el['jconon_application:stato_domanda'] === 'C') {
              // definitiva è editbile per ora solo da amministratori, poi sarà il RDP
              if (!common.User.admin) {
                customButtons.edit = false;
              }
              defaultChoice = 'print';

              if (bandoInCorso) {
                if (common.User.admin || common.User.id === el['jconon_application:user']) {
                  customButtons.reopen = function () {
                    Application.reopen(el, function () {
                      window.location = jconon.URL.application.manage + '?callId=' + el.relationships.parent[0]['cmis:objectId'] + '&applicationId=' + el['cmis:objectId'];
                    });
                  };
                }
              } else {
                if (el['jconon_application:esclusione_rinuncia'] !== 'E' && 
                    el['jconon_application:esclusione_rinuncia'] !== 'N' && 
                    el['jconon_application:esclusione_rinuncia'] !== 'R' &&
                    (common.User.admin || Call.isRdP(callData['jconon_call:rdp']))) {
                  dropdowns['<i class="icon-arrow-down"></i> Escludi'] = function () {
                    allegaDocumentoAllaDomanda('D:jconon_esclusione:attachment',
                      el['cmis:objectId'],
                      function (attachmentsData, data) {
                        jconon.Data.application.reject({
                          type: 'POST',
                          data: {
                            nodeRef : el['cmis:objectId'],
                            nodeRefDocumento : data['cmis:objectId']
                          },
                          success: function () {
                            $('#applyFilter').click();
                          },
                          error: jconon.error
                        });
                      }
                      );
                  };
                }
                if (el['jconon_application:esclusione_rinuncia'] === 'E' ||
                    el['jconon_application:esclusione_rinuncia'] === 'N' ||
                    el['jconon_application:esclusione_rinuncia'] === 'R' &&
                    (common.User.admin || Call.isRdP(callData['jconon_call:rdp']))) {
                  dropdowns['<i class="icon-arrow-up"></i> Riammetti'] = function () {
                    allegaDocumentoAllaDomanda('D:jconon_riammissione:attachment',
                      el['cmis:objectId'],
                      function (attachmentsData, data) {
                        jconon.Data.application.readmission({
                          type: 'POST',
                          data: {
                            nodeRef : el['cmis:objectId'],
                            nodeRefDocumento : data['cmis:objectId']
                          },
                          success: function () {
                            $('#applyFilter').click();
                          },
                          error: jconon.error
                        });
                      }
                      );
                  };
                }
                if (el['jconon_application:esclusione_rinuncia'] !== 'E' &&
                    el['jconon_application:esclusione_rinuncia'] !== 'N' &&
                    el['jconon_application:esclusione_rinuncia'] !== 'R' &&
                    (common.User.admin || Call.isRdP(callData['jconon_call:rdp']))) {
                  dropdowns['<i class="icon-arrow-down text-error"></i> Ritiro domanda di partecipazione'] = function () {
                    allegaDocumentoAllaDomanda('D:jconon_rinuncia:attachment',
                      el['cmis:objectId'],
                      function (attachmentsData, data) {
                        jconon.Data.application.waiver({
                          type: 'POST',
                          data: {
                            nodeRef : el['cmis:objectId'],
                            nodeRefDocumento : data['cmis:objectId']
                          },
                          success: function () {
                            $('#applyFilter').click();
                          },
                          error: jconon.error
                        });
                      }
                      );
                  };
                  dropdowns['<i class="icon-circle-arrow-down text-error"></i> Rinuncia alla graduatoria'] = function () {
                    allegaDocumentoAllaDomanda('D:jconon_rinuncia:attachment',
                      el['cmis:objectId'],
                      function (attachmentsData, data) {
                        jconon.Data.application.retirement({
                          type: 'POST',
                          data: {
                            nodeRef : el['cmis:objectId'],
                            nodeRefDocumento : data['cmis:objectId']
                          },
                          success: function () {
                            $('#applyFilter').click();
                          },
                          error: jconon.error
                        });
                      }
                    );
                  };
                }
                dropdowns['<i class="icon-upload"></i> Comunicazione al candidato'] = function () {
                  allegaDocumentoAllaDomanda('D:jconon_comunicazione:attachment', el['cmis:objectId']);
                };
                dropdowns['<i class="icon-upload"></i> Convocazioni del candidato'] = function () {
                  allegaDocumentoAllaDomanda('D:jconon_convocazione:attachment', el['cmis:objectId']);
                };
                if (common.User.admin || Call.isRdP(callData['jconon_call:rdp'])) {
                  dropdowns['<i class="icon-pencil"></i> Reperibilità'] = function () {
                    var content = $("<div></div>").addClass('modal-inner-fix'),
                      bulkinfo = new BulkInfo({
                      target: content,
                      path: "F:jconon_application:folder",
                      objectId: el['cmis:objectId'],
                      formclass: 'form-horizontal jconon',
                      name: 'reperibilita'
                    });
                    bulkinfo.render();
                    UI.bigmodal('<i class="icon-pencil"></i> Reperibilità', content, function () {
                      var close = UI.progress(), d = bulkinfo.getData();
                      d.push({
                          id: 'cmis:objectId',
                          name: 'cmis:objectId',
                          value: el['cmis:objectId']
                      });
                      jconon.Data.application.main({
                        type: 'POST',
                        data: d,
                        success: function (data) {
                          UI.success(i18n['message.aggiornamento.application.reperibilita']);
                        },
                        complete: close,
                        error: URL.errorFn
                      });
                    });
                  };
                }
                if (!callData['jconon_call:graduatoria']) {
                    dropdowns['<i class="icon-edit"></i> Punteggi'] = function () {
                      Application.punteggi(callData, el['cmis:objectId']);
                    };
                }
                if (common.User.admin || Call.isRdP(callData['jconon_call:rdp']) || Call.isCommissario(callData['jconon_call:commissione'])) {
                  customButtons.operations = dropdowns;
                }
                if (callData['jconon_call:scheda_valutazione'] === true &&
                        (common.User.admin || Call.isCommissario(callData['jconon_call:commissione']) || Call.isConcorsi())
                   ) {
                  customButtons.scheda_valutazione = function () {
                    URL.Data.search.query({
                      queue: true,
                      data: {
                        q: "select cmis:versionSeriesId from jconon_attachment:scheda_valutazione where IN_FOLDER ('" + el['cmis:objectId'] + "')"
                      }
                    }).done(function (rs) {
                      if (rs.totalNumItems === 0 || rs.items[0] === undefined) {
                        UI.confirm('Non &egrave; presente nessuna scheda di valutazione del candidato. Si vuole procedere con la sua predisposizione?', function () {
                          var close = UI.progress();
                          jconon.Data.application.print_scheda_valutazione({
                            type: 'POST',
                            data: {
                              nodeRef : el['cmis:objectId']
                            },
                            success: function (data) {
                              window.location = URL.urls.search.content + '?nodeRef=' + data.nodeRef;
                            },
                            complete: close,
                            error: jconon.error
                          });
                        });
                      } else {
                        window.location = jconon.URL.application.scheda_valutazione + '?applicationId=' + el['cmis:objectId'] + '&nodeRef=' + rs.items[0]['cmis:versionSeriesId'];
                      }
                    });
                  };
                } else {
                  customButtons.scheda_valutazione = false;
                }
              }
            }
            if (common.User.id !== el['jconon_application:user']) {
              customButtons.duplicate = false;
            }
            if (displayActionButton) {
              new ActionButton.actionButton({
                name: el.name,
                nodeRef: el.id,
                baseTypeId: el.baseTypeId,
                objectTypeId: el.objectTypeId,
                mimeType: el.contentType,
                allowableActions: el.allowableActions,
                defaultChoice: defaultChoice
              }, {
                edit: 'CAN_CREATE_DOCUMENT',
                scheda_valutazione: 'CAN_CREATE_DOCUMENT',
                operations: 'CAN_CREATE_DOCUMENT'
              }, customButtons, {
                print: 'icon-print',
                attachments : 'icon-download-alt',
                curriculum: 'icon-file-alt',
                schedaAnonima: 'icon-file-alt',
                productList: 'icon-list',
                productSelected: 'icon-list-ol',
                reopen: 'icon-share',
                duplicate: 'icon-copy',
                scheda_valutazione: 'icon-table',
                operations: 'icon-list'
              }, undefined, undefined, undefined, 'pull-right').appendTo(target);
            }
          });
        });
      }
    }
  });

  bulkInfo =  new BulkInfo({
    target: criteria,
    formclass: 'form-horizontal jconon',
    path: rootTypeId,
    name: 'filters',
    callback : {
      afterCreateForm: function () {
        // rearrange btn-group as btn-group-vertical
        $('#filters-attivi_scaduti').
          add('#filters-provvisorie_inviate')
          .addClass('btn-group-vertical');

        criteria.find('input:not("#user")').on('change', filter);

        $('#applyFilter').on('click', filter);

        criteria
          .find('.btn-group-vertical')
          .closest('.widget')
          .on('changeData', filter);

        $('#resetFilter').off('click').on('click', function () {
          criteria.find('input').val('');
          criteria.find('.widget.authority:visible').data('value', null);
          criteria.find('.widget:not(.authority):visible').data('value', null);

          var btns = criteria.find('.btn-group-vertical .btn');

          btns
            .removeClass('active');

          criteria
            .find('.btn-group-vertical')
            .find('.default')
            .addClass('active');

        });

        filter();
        if (callId || common.pageId == 'applications-user') {
          $('#filters .control-group').hide();
          $('#filters .authority')
            .show()
            .on('changeData', function (event, key, value) {
              if (value !== null && value.length > 0 ) {
                filter();
              }
            });
          $('#filters-provvisorie_inviate').parents('.control-group').show();
          $('#export-xls').show();
        } else {
          $('#filters .authority').hide();
        }
      }
    }
  });
  bulkInfo.render();
});
/*
 *    Copyright (C) 2019  Consiglio Nazionale delle Ricerche
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Affero General Public License as
 *     published by the Free Software Foundation, either version 3 of the
 *     License, or (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU Affero General Public License for more details.
 *
 *     You should have received a copy of the GNU Affero General Public License
 *     along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

package it.cnr.si.cool.jconon.rest;

import it.cnr.cool.cmis.service.FolderService;
import it.cnr.cool.cmis.service.VersionService;
import it.cnr.cool.repository.ZoneRepository;
import it.cnr.cool.rest.util.Util;
import it.cnr.si.cool.jconon.repository.CacheRepository;
import it.cnr.si.cool.jconon.util.EnvParameter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Created by francesco on 13/07/15.
 */

@Path("cache")
@Component
@Produces(MediaType.APPLICATION_JSON)
public class CacheRest {
	private static final int CACHE_CONTROL = 1800;

    private static final Logger LOGGER = LoggerFactory
            .getLogger(CacheRest.class);
	public static final String SERVER_SERVLET_CONTEXT_PATH = "server.servlet.context-path";

	@Autowired
    private ZoneRepository zoneRepository;

    @Autowired
    private CacheRepository cacheRepository;

	@Autowired
	private VersionService versionService;

	@Autowired
	protected FolderService folderService;

	@Inject
	private Environment env;

	protected Map<String, Object> getModel(HttpServletRequest req) {
        Map<String, Object> model = new HashMap<String, Object>();
        model.put("baseUrl", req.getContextPath());
        model.put("redirectUrl",
				Optional.ofNullable(env.getProperty(SERVER_SERVLET_CONTEXT_PATH))
					.filter(s -> s.length() > 0)
					.orElse("/")
		);
		model.put("debug", !versionService.isProduction());
		model.put("dataDictionary", folderService.getDataDictionaryId());
		model.put("zones", zoneRepository.get());
		model.put(EnvParameter.QUERY_INDEX_ENABLE, Boolean.valueOf(env.getProperty("query.index.enable", "true")));
		model.put(CacheRepository.COMPETITION, cacheRepository.getCompetitionFolder());
		model.put(CacheRepository.JSONLIST_CALL_TYPE, cacheRepository.getCallType());
		model.put(CacheRepository.JSONLIST_CALL_FIELDS, cacheRepository.getCallFields());
		model.put(CacheRepository.JSONLIST_AFFIX_APPLICATION, cacheRepository.getAffixApplication());
		model.put(CacheRepository.JSONLIST_APPLICATION_FIELDS_NOT_REQUIRED, cacheRepository.getApplicationFieldsNotRequired());
		model.put(CacheRepository.JSONLIST_APPLICATION_ASPECTS, cacheRepository.getApplicationAspects());
		model.put(CacheRepository.JSONLIST_APPLICATION_ATTACHMENTS, cacheRepository.getApplicationAttachments());
		model.put(CacheRepository.JSONLIST_APPLICATION_CURRICULUMS, cacheRepository.getApplicationCurriculums());
		model.put(CacheRepository.JSONLIST_APPLICATION_SCHEDE_ANONIME, cacheRepository.getApplicationSchedeAnonime());
		model.put(CacheRepository.JSONLIST_TYPE_WITH_MANDATORY_ASPECTS, cacheRepository.getTypeWithMandatoryAspects());
		model.put(CacheRepository.JSONLIST_APPLICATION_PRODOTTI, cacheRepository.getApplicationProdotti());
		model.put(CacheRepository.JSONLIST_CALL_ATTACHMENTS, cacheRepository.getCallAttachments());
		model.put(CacheRepository.JSONLIST_APPLICATION_NO_ASPECTS_ITALIAN, cacheRepository.getApplicationNoAspectsItalian());
		model.put(CacheRepository.JSONLIST_APPLICATION_NO_ASPECTS_FOREIGN, cacheRepository.getApplicationNoAspectsForeign());
		model.putAll(cacheRepository.getExtraModel());
		return model;
	}
	
    @GET
    public Response get(@Context HttpServletRequest req) {
        Map<String, Object> model = getModel(req);
        LOGGER.debug(model.keySet().toString());
        return Response.ok(model).cacheControl(Util.getCache(CACHE_CONTROL)).build();
    }
}
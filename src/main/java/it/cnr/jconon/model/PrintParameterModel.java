package it.cnr.jconon.model;

import java.io.Serializable;

public class PrintParameterModel implements Serializable {

	private static final long serialVersionUID = 7698846044636252098L;
	private final String applicationId, contextURL;
	private final boolean email;
	private String indirizzoEmail, userId;
	public TipoScheda tipoScheda;
	
	public enum TipoScheda{
		SCHEDA_ANONIMA, SCHEDA_VALUTAZIONE
	};
	
	public PrintParameterModel(String applicationId, String contextURL,
			boolean email) {
		super();
		this.applicationId = applicationId;
		this.contextURL = contextURL;
		this.email = email;
	}
	
	public PrintParameterModel(String applicationId, String contextURL,
			boolean email, String indirizzoEmail, String userId, TipoScheda tipoScheda) {
		this(applicationId,contextURL,email);
		this.indirizzoEmail = indirizzoEmail;
		this.userId = userId;
		this.tipoScheda = tipoScheda;
	}

	public String getApplicationId() {
		return applicationId;
	}
	public String getContextURL() {
		return contextURL;
	}
	public boolean isEmail() {
		return email;
	}	
	public String getIndirizzoEmail() {
		return indirizzoEmail;
	}
	public String getUserId() {
		return userId;
	}	
	public TipoScheda getTipoScheda() {
		return tipoScheda;
	}

	@Override
	public boolean equals(Object obj) {
		if (!(obj instanceof PrintParameterModel))
			return false;		
		return this.applicationId.equals(((PrintParameterModel)obj).getApplicationId());
	}
	
	@Override
	public String toString() {
		return "ApplicationId:" + applicationId +
				" - contextURL:" + contextURL +
				" - EMail:"+ email;
	}
	
}
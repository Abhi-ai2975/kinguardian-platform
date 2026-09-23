from abc import ABC, abstractmethod
from customagents.doctorassistent.docagent import DoctorAssistantAgent
from customagents.reportagent.soapagent import SOAPAgent
from customagents.reportagent.assesment import AssessmentAgent
from customagents.previsitagent.intakeagent import IntakeAgent
from customagents.consultagent.consultagent import ConsultingAgent
from customagents.previsitagent.intakeagent import IntakeAgent
from customagents.ehragent.ehragent import EHRAgent
from customagents.reportagent.clinicalextraction import ClinicalExtractionAgent
from customagents.voiceagent.voiceintake import VoiceIntakeAgent
from customagents.voiceagent.voiceconsult import VoiceConsultAgent
from customagents.diarizeagent.diarizeagent import DiarizeAgent
from config.config import Config
from agent.session import Session
from abc import ABC, abstractmethod

class AgentFactory:
    """
    Implementation of the Factory Method Pattern.
    This encapsulates object creation logic.
    """
    
    # Map the strings/enums to classes
    _agent_registry = {
        "doc": DoctorAssistantAgent,
        "soap": SOAPAgent,
        "assessment": AssessmentAgent,
        "consult": ConsultingAgent,
        "intake": IntakeAgent,
        "ehr": EHRAgent,
        "clinical_extraction":ClinicalExtractionAgent,
        "voice_intake": VoiceIntakeAgent,
        "voice_consult": VoiceConsultAgent,
        "diarize": DiarizeAgent,
    }

    @classmethod
    def create(cls, agent_type: str, config, session):
        """
        The Factory Method that returns the concrete Agent instance.
        """
        agent_class = cls._agent_registry.get(agent_type.lower())

        if not agent_class:
            raise ValueError(f"Unknown agent type: {agent_type}. Check your registry.")

        # Design Pattern Principle: Constructor Injection
        # We inject 'config' and 'session' immediately.
        return agent_class(config, session=session)


# class AgentFactory:

#     @staticmethod
#     def create(agent_type: str, config, session: Session):

#         if agent_type == "doc":
#             agent = DoctorAssistantAgent(config)

#         elif agent_type == "soap":
#             agent = SOAPAgent(config)

#         elif agent_type == "assessment":
#             agent = AssessmentAgent(config)
        
#         elif agent_type == "consult":
#             agent = ConsultingAgent(config)
 
#         elif agent_type == "intake":
#             agent = IntakeAgent(config)

#         else:
#             raise ValueError(f"Unknown agent type: {agent_type}")

#         # Assign session to agent BEFORE returning
#         agent.session = session
#         return agent
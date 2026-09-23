import mlflow

_mlflow_instance = None


def get_mlflow_tracker(config):

    global _mlflow_instance

    if not config.mlflow_enabled:
        print("MLflow disabled")
        return None

    if _mlflow_instance is None:

        try:
            mlflow.set_tracking_uri(config.mlflow_tracking_uri)

            print("Tracking URI:", mlflow.get_tracking_uri())

            mlflow.set_experiment(
                config.mlflow_experiment_name or "clinical-agent"
            )
    
            try:
                mlflow.openai.autolog()
                print("MLflow autolog enabled")
            except Exception as e:
                print("Autolog failed:", e)

            _mlflow_instance = mlflow

        except Exception as e:

            print(
                f"MLflow initialization failed: {e}"
            )

            return None

    return _mlflow_instance
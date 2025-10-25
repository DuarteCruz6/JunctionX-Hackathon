import os
import time
from qgis.core import (
    QgsProject,
    QgsRectangle,
    QgsApplication,
    QgsGeometry
)
from qgis.gui import QgsMapCanvas
from qgis.PyQt.QtCore import QSize

# --- CONFIGURAÇÃO - Altere estas variáveis ---

# 1. Nome da camada vetorial (shapefile) com as ÁREAS DE INTERESSE
LAYER_NAME = "COS2018v2-S1"  # <--- NOME DA CAMADA DE ÁREAS

# 2. Nome da camada de SATÉLITE/FUNDO que quer nas fotos.
SATELLITE_LAYER_NAME = "Sentinel-2 2018 (Portugal)"  # <--- NOME DA CAMADA DE SATÉLITE

# 3. Caminho para a pasta onde quer guardar as imagens.
OUTPUT_FOLDER = "C:/Users/danim/fotos_invasoras"  # <--- CAMINHO DA PASTA

# 4. Fator de escala para o offset (1.2 = 20% de margem)
SCALE_FACTOR = 1.2

# 5. Nome de um campo da tabela de atributos que tenha um ID único para cada área.
UNIQUE_ID_FIELD = "ID"  # <--- NOME DO CAMPO DE ID (Verifique se este campo existe!)

# 6. Tamanho da imagem de saída em pixels.
IMAGE_SIZE = QSize(624, 624) # <--- Aumentei a resolução para melhor qualidade

# --- CONFIGURAÇÃO AVANÇADA DE RENDERIZAÇÃO ---

# 7. Número máximo de verificações para ver se a imagem estabilizou.
#    Se a sua internet for lenta, pode aumentar este valor para 20 ou mais.
RENDER_STABILITY_CHECKS = 15

# 8. Intervalo em segundos entre cada verificação. (0.5 = meio segundo)
RENDER_CHECK_INTERVAL = 0.5

# 9. Número de feições a saltar (ignorar) no início.
#    Altere este valor para o número de imagens que quer "skippar".
skippar = 300 # <--- AQUI! Vai saltar as primeiras 300.

# --- FIM DA CONFIGURAÇÃO ---

class MapExporter:
    """
    Classe para exportar imagens de feições, aguardando que a renderização
    de alta qualidade seja concluída através de verificação de estabilidade.
    """
    def __init__(self):
        self.project = QgsProject.instance()
        self.canvas = iface.mapCanvas()
        self.features = []
        self.current_feature_index = 0
        self.output_folder = ""
        self.vector_layer = None
        self.satellite_layer = None
        self.original_canvas_size = self.canvas.size()

    def wait_for_render_to_stabilize_and_save(self):
        """
        Espera que a imagem no canvas pare de mudar e depois guarda-a.
        """
        previous_image = None
        checks_left = RENDER_STABILITY_CHECKS

        print("   -> A aguardar pela renderização completa. A verificar estabilidade...")

        while checks_left > 0:
            # Força o QGIS a processar eventos (como o download de tiles)
            QgsApplication.processEvents()
            time.sleep(RENDER_CHECK_INTERVAL)

            # Tira uma "foto" do canvas
            current_image = self.canvas.grab().toImage()

            if previous_image and current_image == previous_image:
                print(f"   -> Imagem estabilizada após {RENDER_STABILITY_CHECKS - checks_left} verificações. Qualidade máxima atingida.")
                break # A imagem está estável, sai do ciclo

            previous_image = current_image
            checks_left -= 1
            print(f"      ...verificando... ({checks_left} tentativas restantes)")
        
        if checks_left == 0:
            print("   -> AVISO: Tempo limite atingido. A imagem pode não estar na qualidade máxima. A guardar o melhor resultado obtido.")

        # Guardar a imagem final e estável
        feature = self.features[self.current_feature_index]
        feature_id = feature[UNIQUE_ID_FIELD] or f"fid_{feature.id()}"
        output_path = os.path.join(self.output_folder, f"mapa_{feature_id}.png")
        
        self.canvas.saveAsImage(output_path)
        print(f"   -> Imagem guardada em: {output_path}")

        self.current_feature_index += 1
        self.process_next_feature()


    def process_next_feature(self):
        """
        Processa a próxima feição da lista. Se não houver mais, termina.
        """
        if self.current_feature_index >= len(self.features):
            print("\nProcesso concluído com sucesso!")
            self.canvas.resize(self.original_canvas_size) # Restaura o tamanho do canvas
            self.canvas.refresh()
            return
        
        # MODIFICADO: Ajustei a mensagem para mostrar o progresso real, considerando as feições saltadas
        total_a_processar = len(self.features) - skippar
        progresso_atual = self.current_feature_index - skippar + 1
        feature = self.features[self.current_feature_index]
        feature_id = feature[UNIQUE_ID_FIELD] or f"fid_{feature.id()}"
        print(f"\nA processar feição {progresso_atual}/{total_a_processar} (ID: '{feature_id}')")


        geom = feature.geometry()
        bbox = geom.boundingBox()
        
        center = bbox.center()
        width_with_offset = bbox.width() * SCALE_FACTOR
        height_with_offset = bbox.height() * SCALE_FACTOR
        extent = QgsRectangle(
            center.x() - (width_with_offset / 2),
            center.y() - (height_with_offset / 2),
            center.x() + (width_with_offset / 2),
            center.y() + (height_with_offset / 2)
        )
        
        self.canvas.setLayers([self.satellite_layer, self.vector_layer])
        self.canvas.setExtent(extent)
        self.canvas.refresh()
        
        # Em vez de usar um sinal, chamamos diretamente a nossa função de espera
        self.wait_for_render_to_stabilize_and_save()

    def run(self):
        """
        Função principal para iniciar o processo de exportação.
        """
        self.output_folder = OUTPUT_FOLDER
        
        vector_layers = self.project.mapLayersByName(LAYER_NAME)
        if not vector_layers:
            print(f"ERRO: A camada de áreas '{LAYER_NAME}' não foi encontrada.")
            return
        self.vector_layer = vector_layers[0]

        satellite_layers = self.project.mapLayersByName(SATELLITE_LAYER_NAME)
        if not satellite_layers:
            print(f"ERRO: A camada de satélite '{SATELLITE_LAYER_NAME}' não foi encontrada.")
            return
        self.satellite_layer = satellite_layers[0]

        if UNIQUE_ID_FIELD not in self.vector_layer.fields().names():
            print(f"ERRO: O campo '{UNIQUE_ID_FIELD}' não existe na camada '{LAYER_NAME}'.")
            return

        if not os.path.exists(self.output_folder):
            os.makedirs(self.output_folder)
        
        self.features = list(self.vector_layer.getFeatures())
        if not self.features:
            print("AVISO: A camada vetorial não tem feições para processar.")
            return

        # --- MODIFICADO: LÓGICA PARA SALTAR AS PRIMEIRAS FEIÇÕES ---
        if skippar > 0:
            if len(self.features) <= skippar:
                print(f"AVISO: O número total de feições ({len(self.features)}) é menor ou igual ao número a saltar ({skippar}).")
                print("Nenhum mapa será exportado. Verifique o valor da variável 'skippar'.")
                return
            
            print(f"INFO: A saltar as primeiras {skippar} feições conforme solicitado...")
            self.current_feature_index = skippar
        else:
            self.current_feature_index = 0
        # --- FIM DA MODIFICAÇÃO ---
        
        self.canvas.resize(IMAGE_SIZE)
        # self.current_feature_index = 0 # <--- MODIFICADO: Esta linha já não é necessária aqui
        self.process_next_feature()

# --- Para executar o código ---
exporter = MapExporter()
exporter.run()
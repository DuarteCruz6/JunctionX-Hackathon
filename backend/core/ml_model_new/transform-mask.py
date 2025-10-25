import os

# 1. COLOQUE AQUI O CAMINHO PARA A SUA PASTA
# Exemplo para Windows: "C:\\Users\\SeuNome\\Desktop\\PastaDasImagens"
# Exemplo para macOS/Linux: "/home/seu_nome/documentos/imagens"
caminho_da_pasta = "C:/Users/danim/OneDrive/Ambiente de Trabalho/JunctionX-Hackathon/backend/core/ml_model_new/dataset/labels/train"

# Verifica se o caminho fornecido é válido
if not os.path.isdir(caminho_da_pasta):
    print(f"Erro: O caminho '{caminho_da_pasta}' não existe ou não é uma pasta.")
else:
    print(f"A procurar ficheiros em: {caminho_da_pasta}\n")

    # Lista todos os ficheiros na pasta
    for nome_ficheiro in os.listdir(caminho_da_pasta):
        
        # Verifica se "_mask" está no nome do ficheiro
        if "_mask" in nome_ficheiro:
            
            # Cria o novo nome do ficheiro substituindo "_mask" por nada ""
            novo_nome_ficheiro = nome_ficheiro.replace("_mask", "")
            
            # Cria o caminho completo para o ficheiro original e para o novo
            caminho_original = os.path.join(caminho_da_pasta, nome_ficheiro)
            novo_caminho = os.path.join(caminho_da_pasta, novo_nome_ficheiro)
            
            try:
                # Renomeia o ficheiro
                os.rename(caminho_original, novo_caminho)
                print(f"Renomeado: '{nome_ficheiro}' -> '{novo_nome_ficheiro}'")
            except OSError as e:
                print(f"Erro ao renomear {nome_ficheiro}: {e}")

    print("\nProcesso concluído!")
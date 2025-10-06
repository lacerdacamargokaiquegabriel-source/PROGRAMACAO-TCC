import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Location from 'expo-location';
import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';

function Jogo() {
    // Autenticação: exibe tela de login/cadastro se não houver token
  const [token, setToken] = useState(null);
  const [checkingToken, setCheckingToken] = useState(true);
useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem('token');
      setToken(t);
      setCheckingToken(false);
    })();
  }, []);

  if (checkingToken) return null;
  if (!token) {
    const Login = require('./login').default;
    return <Login onLogin={async (t) => { await AsyncStorage.setItem('token', t); setToken(t); }} />;
  }
  //

    // Músicas salvas do usuário logado
    const [userMusicas, setUserMusicas] = useState([]);
    const [userMusicasLoading, setUserMusicasLoading] = useState(false);

    // Buscar músicas do usuário logado
    const BACKEND_IP = 'http://192.168.0.100:3001'; // Altere para o IP da sua máquina
    const fetchUserMusicas = async () => {
      setUserMusicasLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${BACKEND_IP}/musicas`, {
          headers: { 'Authorization': token }
        });
        const data = await res.json();
        setUserMusicas(data);
      } catch (e) {
        setUserMusicas([]);
      }
      setUserMusicasLoading(false);
    };

    useEffect(() => {
      fetchUserMusicas();
    }, []);

    // Salvar música local no backend
    const handleSaveLocalTrack = async (track) => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${BACKEND_IP}/musicas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify({ nome: track.name, caminho: track.uri })
        });
        if (res.ok) {
          await fetchUserMusicas();
          alert('Música salva!');
        } else {
          alert('Erro ao salvar música.');
        }
      } catch (e) {
        alert('Erro ao salvar música.');
      }
    };

  // Selecionar música do dispositivo
  const handleAddLocalMusic = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
      console.log('Retorno do DocumentPicker:', result);
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocalTracks(prev => [...prev, ...result.assets]);
        // Salvar cada música selecionada no backend
        for (const track of result.assets) {
          await handleSaveLocalTrack(track);
        }
      } else {
        alert('Seleção de arquivo não foi bem-sucedida.');
      }
    } catch (e) {
      alert('Erro ao selecionar música.');
      console.log('Erro ao selecionar música:', e);
    }
  };

  // Audius API
  const [audiusTracks, setAudiusTracks] = useState([]);
  const [audiusLoading, setAudiusLoading] = useState(true);
  const [trackIdx, setTrackIdx] = useState(0);

  // Busca faixas lofi do Audius
  const fetchAudiusTracks = useCallback(async () => {
    setAudiusLoading(true);
    try {
      const res = await fetch('https://discoveryprovider.audius.co/v1/tracks/search?query=lofi&app_name=PROGRAMACAO-TCC&limit=20&with_users=true');
      const json = await res.json();
      // Filtra faixas que têm stream_url ou permalink válido
      const tracks = (json.data || []).filter(track => track.stream_url || track.permalink);
      setAudiusTracks(tracks);
    } catch (e) {
      setAudiusTracks([]);
    }
    setAudiusLoading(false);
  }, []);

  useEffect(() => {
    fetchAudiusTracks();
  }, [fetchAudiusTracks]);

  // Player Audius
  const [sound, setSound] = useState(null);
  const [tocando, setTocando] = useState(false);
  const [loading, setLoading] = useState(false);
        // ...continuação da função Jogo...

  // (Removidas duplicações de estados e funções)

  // Tocar música local e atualizar nome
  const playLocalTrack = async (track) => {
    if (loading) return;
    if (!track || !track.uri) return;
    setCurrentLocalTrack(track);
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    setLoading(true);
    try {
      // Configura o modo de reprodução para background
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: track.uri });
      setSound(newSound);
      await newSound.playAsync();
      setTocando(true);
    } catch (e) {
      alert('Erro ao tentar tocar a música local.');
      console.log('Erro ao tocar música local:', e);
      setTocando(false);
    }
    setLoading(false);
  };

  const playAudiusTrack = async (url) => {
    if (loading) return;
    if (!url) {
      alert('Nenhum stream disponível para esta faixa.');
      return;
    }
    console.log('Tocando URL:', url);
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    setLoading(true);
    try {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: url });
      setSound(newSound);
      await newSound.playAsync();
      setTocando(true);
    } catch (e) {
      alert('Erro ao tentar tocar a música.');
      setTocando(false);
    }
    setLoading(false);
  };

  const handlePlayPause = async () => {
    if (loading) return;
    // Se música local está selecionada, controla ela
    if (currentLocalTrack) {
      if (!sound) {
        await playLocalTrack(currentLocalTrack);
      } else if (tocando) {
        await sound.pauseAsync();
        setTocando(false);
      } else {
        await sound.playAsync();
        setTocando(true);
      }
      return;
    }
    // Caso contrário, controla Audius
    if (audiusTracks.length === 0) return;
    const track = audiusTracks[trackIdx];
    const streamUrl = track.stream_url || (track.permalink ? track.permalink + '/stream' : null);
    if (!sound) {
      await playAudiusTrack(streamUrl);
    } else if (tocando) {
      await sound.pauseAsync();
      setTocando(false);
    } else {
      // Ao despausar, apenas continua a música
      await sound.playAsync();
      setTocando(true);
    }
  };

  const handleNext = async () => {
  if (audiusTracks.length === 0) return;
  let nextIdx = (trackIdx + 1) % audiusTracks.length;
  setTrackIdx(nextIdx);
  const track = audiusTracks[nextIdx];
  const streamUrl = track.stream_url || (track.permalink ? track.permalink + '/stream' : null);
  await playAudiusTrack(streamUrl);
  };

  const handlePrev = async () => {
  if (audiusTracks.length === 0) return;
  let prevIdx = (trackIdx - 1 + audiusTracks.length) % audiusTracks.length;
  setTrackIdx(prevIdx);
  const track = audiusTracks[prevIdx];
  const streamUrl = track.stream_url || (track.permalink ? track.permalink + '/stream' : null);
  await playAudiusTrack(streamUrl);
  };
  const [clima, setClima] = useState({ temperatura: '--', icone: '--' });
  const [hora, setHora] = useState('');

  useEffect(() => {
    const updateHora = () => {
      const now = new Date();
      setHora(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateHora();
    const timer = setInterval(updateHora, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function getLocationAndFetchClima() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permissão de localização negada!');
        return;
      }
  let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const { latitude, longitude } = location.coords;
      const apiKey = 'f69ab47389319d7de688f72898bde932';
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=pt_br`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.main && data.weather) {
        let status = data.weather[0].main;
        let icone = '';
        if (status === 'Clear') icone = '☀️ Sol';
        else if (status === 'Rain' || status === 'Drizzle') icone = '🌧️ Chuva';
        else if (status === 'Clouds') icone = '☁️ Nublado';
        else icone = `${status}`;
        setClima({
          temperatura: `${Math.round(data.main.temp)}°C`,
          icone: icone
        });
      } else {
        setClima({
          temperatura: '--',
          icone: '--'
        });
        alert('Não foi possível obter o clima. Verifique a chave da API ou tente novamente.');
      }
    }
    getLocationAndFetchClima();
  }, []);

  useEffect(() => {
    // Nenhuma configuração TrackPlayer, apenas expo-av
  }, []);

  return (
    <ImageBackground source={require('../assets/images/background2.gif')} style={styles.container} resizeMode="cover">
      {/* Menu hamburger opaco */}
      <TouchableOpacity style={styles.hamburger} activeOpacity={0.5}>
        <View style={styles.burgerLine} />
        <View style={styles.burgerLine} />
        <View style={styles.burgerLine} />
      </TouchableOpacity>
      <View style={styles.grid}>
        <View style={styles.row}>
          <View style={styles.box}><Text style={styles.boxText}></Text></View>
          <View style={styles.box}>
            <Text style={styles.boxText}></Text>
            <View style={styles.relogioArea}>
              <View style={styles.climaRelogioArea}>
                <Text style={styles.climaText}>{clima.temperatura} {clima.icone}</Text>
                <Text style={styles.relogio}>{hora}</Text>
              </View>
            </View>
          </View>
        </View>
        {/* Cronômetro grande centralizado */}
        <View style={styles.row}>
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <View style={styles.cronometroArea}>
              {(() => {
                const { min, sec, milis } = formatarTempo(cronometro);
                return (
                  <Text style={styles.cronometroTexto}>
                    {min}:{sec}
                    <Text style={styles.cronometroMilis}>{milis}</Text>
                  </Text>
                );
              })()}
              <View style={{flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center'}}>
                <TouchableOpacity onPress={() => setCronometroAtivo(true)} style={styles.cronometroBtn}><Text style={styles.cronometroBtnTexto}>Iniciar</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setCronometroAtivo(false)} style={styles.cronometroBtn}><Text style={styles.cronometroBtnTexto}>Pausar</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => {setCronometro(0); setCronometroAtivo(false); setCronometroInicio(null);}} style={styles.cronometroBtn}><Text style={styles.cronometroBtnTexto}>Zerar</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.box}><Text style={styles.boxText}></Text></View>
          <View style={styles.box}>
            {/* Player Audius */}
            <View style={styles.musicPlayerBg}>
              {audiusLoading ? (
                <Text style={styles.musicNow}>Carregando músicas...</Text>
              ) : audiusTracks.length === 0 ? (
                <Text style={styles.musicNow}>Nenhuma música encontrada</Text>
              ) : (
                <View>
                  <View style={styles.musicTop}>
                    {/* Se música local tocando, mostra nome dela */}
                    {currentLocalTrack ? (
                      <View style={{ flex: 1 }}>
                        <Text style={styles.musicName}>{currentLocalTrack.name}</Text>
                        <Text style={styles.musicArtist}>Música do dispositivo</Text>
                      </View>
                    ) : (
                      <>
                        {audiusTracks[trackIdx].artwork && (
                          <Image source={{ uri: audiusTracks[trackIdx].artwork['150x150'] }} style={styles.musicImg} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.musicName}>{audiusTracks[trackIdx].title}</Text>
                          <Text style={styles.musicArtist}>{audiusTracks[trackIdx].user && audiusTracks[trackIdx].user.name}</Text>
                        </View>
                      </>
                    )}
                  </View>
                  <View style={styles.musicControlsMenu}>
                    <TouchableOpacity onPress={handlePrev} style={styles.musicBtn} disabled={loading}>
                      <Image source={require('../assets/images/icons/anterior.png')} style={{width: 32, height: 32}} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePlayPause} style={styles.musicBtn} disabled={loading}>
                      {loading ? (
                        <Text style={styles.musicBtnText}>...</Text>
                      ) : tocando ? (
                        <Image source={require('../assets/images/icons/pause.png')} style={{width: 32, height: 32}} />
                      ) : (
                        <Image source={require('../assets/images/icons/play.png')} style={{width: 32, height: 32}} />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleNext} style={styles.musicBtn} disabled={loading}>
                      <Image source={require('../assets/images/icons/proxima.png')} style={{width: 32, height: 32}} />
                    </TouchableOpacity>
                  </View>
                  {/* Ícones add e list abaixo dos controles */}
                  <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 12}}>
                    <TouchableOpacity onPress={() => {console.log('Botão adicionar música clicado'); handleAddLocalMusic();}}>
                      <Image source={require('../assets/images/icons/add.png')} style={{width: 28, height: 28}} />
                    </TouchableOpacity>
                    {localTracks.length > 0 && (
                      <TouchableOpacity onPress={() => setShowLocalList(v => !v)}>
                        <Image source={require('../assets/images/icons/list.png')} style={{width: 28, height: 28}} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {/* Músicas salvas do usuário logado */}
                  <View style={{marginTop: 18}}>
                    <Text style={{color: '#ffb300', fontWeight: 'bold', fontSize: 16}}>Minhas músicas salvas:</Text>
                    {userMusicasLoading ? (
                      <Text style={{color: '#fff'}}>Carregando...</Text>
                    ) : userMusicas.length === 0 ? (
                      <Text style={{color: '#fff'}}>Nenhuma música salva</Text>
                    ) : (
                      userMusicas.map(musica => (
                        <TouchableOpacity key={musica.id} style={{padding: 8, marginVertical: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8}} onPress={async () => await playLocalTrack({ name: musica.nome, uri: musica.caminho })}>
                          <Text style={{color: '#fff'}}>{musica.nome}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>
              )}
              {/* Lista de músicas locais */}
              {/* Lista de músicas locais removida pois controles já estão visíveis */}
            </View>
          </View>
        </View>
      </View>
      {showLocalList && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.95)',
          zIndex: 9999,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}>
          <TouchableOpacity style={{marginBottom: 32}} onPress={() => setShowLocalList(false)}>
            <Text style={{color: '#ffb300', fontSize: 22, fontWeight: 'bold'}}>Fechar</Text>
          </TouchableOpacity>
          <Text style={[styles.localMusicTitle, {fontSize: 24, color: '#ffb300'}]}>Músicas do dispositivo:</Text>
          {localTracks.map((track, idx) => (
            <TouchableOpacity key={track.uri} style={[styles.localMusicItem, {padding: 16, marginVertical: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, width: '90%'}]} onPress={async () => await playLocalTrack(track)}>
              <Text style={[styles.localMusicText, {fontSize: 18, textAlign: 'center'}]}>{track.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ImageBackground>
  );
}
export default Jogo;

const styles = StyleSheet.create({
  cronometroArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  cronometroTexto: {
    fontSize: 64,
    color: '#ffb300',
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  cronometroMilis: {
    fontSize: 32,
    color: '#ffb300',
    fontWeight: 'bold',
    opacity: 0.7,
    marginLeft: 4,
    position: 'relative',
    top: 8,
  },
  cronometroBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  cronometroBtnTexto: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addMusicBtnAlways: {
    backgroundColor: '#ffb300',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignSelf: 'center',
    width: '90%',
    elevation: 4,
  },
  addMusicBtnContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  addMusicBtn: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'center',
  },
  addMusicBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  localMusicList: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.10)',
    borderRadius: 8,
  },
  localMusicTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
  },
  localMusicItem: {
    paddingVertical: 4,
  },
  localMusicText: {
    color: '#fff',
    fontSize: 14,
  },
  musicArtist: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 2,
  },
  musicNow: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
  },
  musicControlsMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 16,
  },
  musicPlayerBg: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    padding: 16,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  musicImg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  musicName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  musicBtn: {
    marginHorizontal: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  musicBtnText: {
    fontSize: 28,
    color: '#fff',
  },
  container: { flex: 1 },
  hamburger: {
    position: 'absolute',
    top: 32,
    left: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.25,
    zIndex: 10,
  },
  burgerLine: {
    width: 28,
    height: 4,
    backgroundColor: '#fff',
    marginVertical: 2,
    borderRadius: 2,
  },
  grid: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    marginBottom: 0,
  },
  box: {
  flex: 1,
  margin: 8,
  backgroundColor: 'transparent',
  borderRadius: 18,
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
  },
  boxText: {
    color: '#0a174e',
    fontSize: 32,
    fontWeight: 'bold',
  },
  relogioArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 64, // ainda mais alto
  },
  climaRelogioArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  climaArea: {
    marginTop: 8,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  climaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.10)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  relogioSpacer: {
    flex: 0,
    height: '70%',
  },
  relogio: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.10)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 0,
  },
  text: { color: "#fff", fontSize: 28, fontWeight: "bold" },
});
